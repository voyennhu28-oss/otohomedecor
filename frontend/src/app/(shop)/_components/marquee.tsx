type MarqueeProps = {
  items: string[];
};

/**
 * Dải chữ lớn chạy ngang. Nội dung lặp 2 lần để chạy liền mạch;
 * bản lặp ẩn với trình đọc màn hình. Tắt chuyển động khi người dùng bật giảm chuyển động.
 */
export function Marquee({ items }: MarqueeProps) {
  const row = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className='flex shrink-0 items-center'
    >
      {items.map((item) => (
        <li key={item} className='flex items-center'>
          <span className='px-8 font-heading text-6xl font-medium whitespace-nowrap italic md:text-8xl'>
            {item}
          </span>
          <span
            aria-hidden
            className='size-4 rounded-full border-2 border-current md:size-5'
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className='overflow-hidden border-y py-6 md:py-8'>
      <div className='flex w-max animate-marquee motion-reduce:animate-none'>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
