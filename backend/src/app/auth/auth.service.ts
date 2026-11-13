import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { UserInfo } from '../../common/decorators/user.decorator';
import { MailUtilService } from '../../common/utils/mail-util/mail-util.service';
import { safeHtml } from '../../common/utils/string-util/html.util';
import { SALT_ROUNDS, UsersService } from '../users/users.service';
import {
  ACCESS_TOKEN_TTL,
  JwtPayload,
  JWTEnvs,
  REFRESH_TOKEN_TTL,
  RESET_PASSWORD_TTL,
  TokenType,
} from './consts/jwt.const';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import { SignInDto, SignUpDto } from './dto/sign.dto';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/**
 * Hash giả (cùng cost với hash thật) để signIn luôn chạy bcrypt.compare kể cả khi email
 * không tồn tại → không dò được email đã đăng ký qua thời gian phản hồi.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), SALT_ROUNDS);

type TokenUser = Pick<User, 'id' | 'email' | 'role'> & {
  tokenVersion?: number | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshSecret: string;
  private readonly feUrl: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailUtilService: MailUtilService,
    config: ConfigService,
  ) {
    this.refreshSecret = config.getOrThrow<string>(JWTEnvs.JWT_REFRESH_SECRET);
    this.feUrl = (config.get<string>('FE_URL') ?? 'http://localhost:3000')
      .split(',')[0]
      .trim();
  }

  async signUp(dto: SignUpDto) {
    const user = await this.usersService.create({
      ...dto,
      role: Role.customer,
      status: UserStatus.active,
    });
    return { user, ...(await this.createTokens(user)) };
  }

  async signIn({ email, password }: SignInDto) {
    const user = await this.usersService.findForAuth({ email });
    const isMatch = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (user.status !== UserStatus.active) {
      throw new ForbiddenException('Tài khoản đã bị khóa');
    }
    return {
      user: await this.usersService.getMe(user.id),
      ...(await this.createTokens(user)),
    };
  }

  async refreshToken(refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException('Thiếu refresh token');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
    if (payload.type !== TokenType.REFRESH) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const user = await this.usersService.findForAuth({ id: payload.userID });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    if (user.status !== UserStatus.active) {
      throw new ForbiddenException('Tài khoản đã bị khóa');
    }
    // Đổi / reset mật khẩu hoặc bị khóa sẽ tăng tokenVersion → refresh token phát trước đó bị từ chối
    if ((payload.ver ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại',
      );
    }
    return this.createTokens(user);
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const user = await this.usersService.findForAuth({ email });

    if (user?.status === UserStatus.active) {
      // Không await: email có tồn tại hay không thì thời gian phản hồi như nhau,
      // và gửi mail không chặn response. Lỗi được ghi log bên trong.
      void this.sendResetPasswordEmail(user);
    }

    return {
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi',
    };
  }

  async resetPassword({ token, newPassword }: ResetPasswordDto) {
    const user = await this.usersService.findByResetPasswordToken(
      hashToken(token),
    );
    if (!user) {
      throw new BadRequestException(
        'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );
    }
    await this.usersService.updatePassword(user, newPassword);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  /**
   * Đổi mật khẩu làm mọi refresh token cũ (mọi thiết bị) mất hiệu lực.
   * Trả về cặp token mới để phiên hiện tại không bị đăng xuất.
   */
  async changePassword(
    currentUser: UserInfo,
    { oldPassword, newPassword }: ChangePasswordDto,
  ) {
    const user = await this.usersService.findForAuth({
      id: currentUser.userID,
    });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }
    const tokenVersion = await this.usersService.updatePassword(user, newPassword);
    return {
      message: 'Đổi mật khẩu thành công',
      ...(await this.createTokens({ ...user, tokenVersion })),
    };
  }

  private async sendResetPasswordEmail(user: Pick<User, 'id' | 'email' | 'fullName'>) {
    try {
      const token = randomBytes(32).toString('hex');
      await this.usersService.setResetPasswordToken(
        user.id,
        hashToken(token),
        new Date(Date.now() + RESET_PASSWORD_TTL * 1000),
      );

      const link = `${this.feUrl}/reset-password?token=${token}`;
      const minutes = RESET_PASSWORD_TTL / 60;
      await this.mailUtilService.send({
        to: user.email,
        subject: 'Đặt lại mật khẩu',
        text: `Chào ${user.fullName},\n\nMở link sau để đặt lại mật khẩu (hết hạn sau ${minutes} phút):\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
        html: safeHtml`<p>Chào ${user.fullName},</p><p>Bấm vào link sau để đặt lại mật khẩu (hết hạn sau ${minutes} phút):</p><p><a href="${link}">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
      });
    } catch (error) {
      this.logger.error(
        `Gửi email đặt lại mật khẩu cho user ${user.id} thất bại`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async createTokens(user: TokenUser) {
    const info: UserInfo = {
      userID: user.id,
      userEmail: user.email,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...info, type: TokenType.ACCESS },
        { expiresIn: ACCESS_TOKEN_TTL },
      ),
      this.jwtService.signAsync(
        { ...info, type: TokenType.REFRESH, ver: user.tokenVersion ?? 0 },
        { secret: this.refreshSecret, expiresIn: REFRESH_TOKEN_TTL },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
