import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import styles from "./login.module.css";

type LoginPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectIfAuthenticated();

  const params = await searchParams;
  const initialError =
    params.reason === "profile"
      ? "لا يمكن فتح حسابك حالياً. تواصل مع مسؤول النظام."
      : null;

  return (
    <div className={styles.page}>
      <section className={styles.composition} aria-labelledby="login-title">
        <div className={styles.brandPlate}>
          <Image
            src="/brand/zamblak-logo-ar.png"
            alt="زمبلك للأبحاث الميدانية"
            width={1204}
            height={608}
            priority
            className={styles.brandImage}
          />
        </div>

        <div className={styles.heading}>
          <h1
            id="login-title"
            className="text-balance text-[clamp(2rem,2.5vw,2.625rem)] font-bold leading-[1.4] text-[#002627]"
          >
            تسجيل الدخول
          </h1>
          <p className="mx-auto mt-2 max-w-[34rem] text-pretty text-base leading-7 text-[#404848] sm:text-lg sm:leading-8">
            أدخل بيانات حسابك للوصول إلى مساحة العمل.
          </p>
        </div>

        <div className={styles.formSurface}>
          <LoginForm initialError={initialError} />
        </div>
      </section>
    </div>
  );
}
