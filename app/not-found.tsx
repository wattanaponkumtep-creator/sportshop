import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center sport-gradient p-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="font-mono text-6xl font-bold text-primary">404</div>
        <h1 className="text-2xl font-bold">ไม่พบหน้านี้</h1>
        <p className="text-muted-foreground">หน้าที่คุณต้องการอาจถูกย้ายหรือไม่มีอยู่</p>
        <Link href="/" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          กลับหน้าหลัก
        </Link>
      </div>
    </main>
  );
}
