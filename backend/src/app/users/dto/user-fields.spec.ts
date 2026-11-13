import { ChangePasswordDto, ResetPasswordDto } from '../../auth/dto/password.dto';
import { SignUpDto } from '../../auth/dto/sign.dto';
import { CreateUserDto } from './create-user.dto';
import { UpdateMeDto } from './update-me.dto';
import { passwordSchema } from './user-fields';

/** 37 chữ "ê" = 37 ký tự nhưng 74 byte UTF-8. */
const TOO_LONG_BYTES = 'ê'.repeat(37);
const MAX_BYTES = 'ê'.repeat(36); // 72 byte

describe('passwordSchema (BUG-05: bcrypt chỉ dùng 72 byte đầu)', () => {
  it('nhận mật khẩu đúng 72 byte, từ chối 73+ byte dù chưa tới 72 ký tự', () => {
    expect(passwordSchema.safeParse(MAX_BYTES).success).toBe(true);
    expect(passwordSchema.safeParse(`${MAX_BYTES}a`).success).toBe(false);
    expect(TOO_LONG_BYTES.length).toBeLessThan(72);
    expect(passwordSchema.safeParse(TOO_LONG_BYTES).success).toBe(false);
  });

  it('ASCII: tối đa 72 ký tự, tối thiểu 8', () => {
    expect(passwordSchema.safeParse('a'.repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(73)).success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(7)).success).toBe(false);
  });

  it.each([
    ['sign-up', () => SignUpDto.schema.safeParse({ email: 'a@b.com', password: TOO_LONG_BYTES, fullName: 'A' })],
    ['reset-password', () => ResetPasswordDto.schema.safeParse({ token: 'a'.repeat(64), newPassword: TOO_LONG_BYTES })],
    ['change-password', () => ChangePasswordDto.schema.safeParse({ oldPassword: 'old12345', newPassword: TOO_LONG_BYTES })],
    ['POST /admin/users', () => CreateUserDto.schema.safeParse({ email: 'a@b.com', password: TOO_LONG_BYTES, fullName: 'A' })],
  ])('%s từ chối mật khẩu quá 72 byte', (_name, parse) => {
    expect(parse().success).toBe(false);
  });
});

describe('UpdateMeDto.avatarUrl (BUG-06)', () => {
  it('chỉ nhận http(s), cho phép null để xóa ảnh', () => {
    expect(UpdateMeDto.schema.safeParse({ avatarUrl: 'https://cdn.example.com/a.jpg' }).success).toBe(true);
    expect(UpdateMeDto.schema.safeParse({ avatarUrl: null }).success).toBe(true);
    expect(UpdateMeDto.schema.safeParse({ avatarUrl: 'javascript:alert(document.cookie)' }).success).toBe(false);
  });
});
