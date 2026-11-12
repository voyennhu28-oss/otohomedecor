import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class MailUtilService {
  private readonly logger = new Logger(MailUtilService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    const host = config.get<string>('MAIL_HOST');
    const user = config.get<string>('MAIL_USER');
    this.from =
      config.get<string>('MAIL_FROM') ?? user ?? 'no-reply@homedecor.local';
    this.isProduction = config.get<string>('NODE_ENV') === 'production';

    if (host) {
      const port = Number(config.get<string>('MAIL_PORT') ?? 587);
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass: config.get<string>('MAIL_PASS') } : undefined,
      });
    } else {
      this.logger.warn('MAIL_HOST chưa cấu hình: email sẽ không được gửi đi');
    }
  }

  async send({ to, subject, html, text }: SendMailParams) {
    if (!this.transporter) {
      // Dev: in nội dung ra log để test (vd lấy link reset password).
      // Production: không in nội dung vì có thể chứa token.
      this.logger.warn(
        this.isProduction
          ? `Bỏ qua email "${subject}" tới ${to}: chưa cấu hình MAIL_HOST`
          : `[mail chưa gửi] to=${to} subject="${subject}"\n${text}`,
      );
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html, text });
  }
}
