export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-indigo-50 via-background to-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            秋
          </span>
          <h1 className="text-xl font-semibold">秋招追踪</h1>
          <p className="text-sm text-muted-foreground">
            投递记录、面试进展、岗位匹配，一个地方管完
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
