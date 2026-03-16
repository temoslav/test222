export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] rounded-[32px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.08)] animate-pulse">
        <div className="h-9 w-28 rounded bg-[#EEEEEE] mx-auto" />
        <div className="h-4 w-44 rounded bg-[#EEEEEE] mx-auto mt-3" />
        <div className="h-12 rounded-xl bg-[#EEEEEE] mt-8" />
        <div className="h-12 rounded-xl bg-[#EEEEEE] mt-4" />
        <div className="h-12 rounded-xl bg-[#E2E2E2] mt-5" />
      </div>
    </div>
  )
}
