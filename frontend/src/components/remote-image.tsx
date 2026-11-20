import Image from 'next/image';

const OPTIMIZED_HOSTS = ['res.cloudinary.com'];

function isOptimizable(src: string) {
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

type RemoteImageProps = Omit<
  React.ComponentProps<typeof Image>,
  'src' | 'unoptimized' | 'fill'
> & { src: string };

export function RemoteImage({ src, alt, ...props }: RemoteImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized={!isOptimizable(src)}
      {...props}
    />
  );
}
