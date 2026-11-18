type ComingSoonProps = {
  /** Giai đoạn trong kế hoạch (docs/admin-api-roadmap.md). */
  phase: string;
  /** Endpoint backend trang này sẽ dùng. */
  endpoints: string[];
};

/** Khung tạm cho trang admin chưa nối API. Xóa khi làm xong trang. */
export function ComingSoon({ phase, endpoints }: ComingSoonProps) {
  return (
    <div className='rounded-lg border border-dashed bg-muted/40 p-6'>
      <p className='label-caps text-muted-foreground'>{phase}</p>
      <p className='mt-2 text-sm text-muted-foreground'>
        Trang này chưa nối API. Endpoint sẽ dùng:
      </p>
      <ul className='mt-3 flex flex-col gap-1.5 font-mono text-xs'>
        {endpoints.map((endpoint) => (
          <li key={endpoint}>{endpoint}</li>
        ))}
      </ul>
    </div>
  );
}
