import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/features/auth/types';
import { cn } from '@/lib/utils';

export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function getGivenName(name: string) {
  return name.trim().split(/\s+/).pop() ?? name;
}

type UserAvatarProps = {
  user: Pick<User, 'fullName' | 'avatarUrl'>;
  shape?: 'round' | 'square';
  className?: string;
};

export function UserAvatar({
  user,
  shape = 'round',
  className,
}: UserAvatarProps) {
  const radius = shape === 'square' ? 'rounded-sm' : 'rounded-full';

  return (
    <Avatar
      className={cn(
        'size-8',
        radius,
        shape === 'square' && 'after:rounded-sm',
        className,
      )}
    >
      {user.avatarUrl && (
        <AvatarImage src={user.avatarUrl} alt='' className={radius} />
      )}
      <AvatarFallback
        className={cn(
          radius,
          'bg-secondary text-xs font-medium text-secondary-foreground',
        )}
      >
        {getInitials(user.fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
