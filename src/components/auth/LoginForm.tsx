export function LoginForm() {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-background rounded-xl p-3 w-16 h-16 flex items-center justify-center shadow-sm mb-4">
          <span className="text-primary font-bold text-3xl">Z</span>
        </div>
        <h2 className="text-2xl font-bold text-primary tracking-tight text-center">
          زمبلك للأبحاث الميدانية
        </h2>
        <p className="text-gray-500 mt-2 text-lg">تسجيل الدخول</p>
      </div>

      <form className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-lg font-medium text-foreground">
            اسم المستخدم أو البريد الإلكتروني
          </label>
          <input
            id="username"
            type="text"
            className="w-full min-h-[48px] px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-lg font-medium text-foreground">
            كلمة المرور
          </label>
          <input
            id="password"
            type="password"
            className="w-full min-h-[48px] px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg"
            dir="ltr"
          />
        </div>

        <button
          type="button"
          className="w-full min-h-[48px] bg-primary text-white text-xl font-medium rounded-xl hover:bg-primary/90 transition-colors focus:ring-4 focus:ring-primary/20 outline-none mt-8"
        >
          دخول
        </button>
      </form>
    </div>
  );
}
