import Link from "next/link";

export default function TrackNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center sport-gradient p-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-bold">ไม่พบงาน</h1>
        <p className="text-muted-foreground">ลิงก์ติดตามไม่ถูกต้องหรือถูกยกเลิกแล้ว กรุณาตรวจสอบกับทางร้าน</p>
        <Link href="/" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          กลับหน้าหลัก
        </Link>
      </div>
    </main>
  );
}
