import nodemailer from "nodemailer";

const isDev = !process.env.SMTP_USER || process.env.SMTP_USER === "";

const transporter = isDev
  ? nodemailer.createTransport({ streamTransport: true, newline: "unix" })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "TransportSaaS";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? `${APP_NAME} <noreply@example.com>`;

export async function sendMagicLink(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/magic-link/verify?token=${token}`;
  if (isDev) {
    console.log(`\n[DEV] Magic Link para ${email}:\n${url}\n`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Seu link de acesso — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Acesse sua conta</h2>
        <p style="color:#475569">Clique no botão abaixo para entrar no ${APP_NAME}. O link expira em <strong>15 minutos</strong>.</p>
        <a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Entrar agora
        </a>
        <p style="color:#94a3b8;font-size:12px">Se você não solicitou este link, ignore este email.</p>
      </div>
    `,
  });
}

export async function sendTwoFactorCode(email: string, code: string): Promise<void> {
  if (isDev) {
    console.log(`\n[DEV] Código 2FA para ${email}: ${code}\n`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Código de verificação — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Código de verificação</h2>
        <p style="color:#475569">Use o código abaixo para completar seu login:</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:16px 0">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a">${code}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px">O código expira em 10 minutos.</p>
      </div>
    `,
  });
}

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/reset-password?token=${token}`;
  if (isDev) {
    console.log(`\n[DEV] Reset de senha para ${email}:\n${url}\n`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Redefinir senha — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Redefinir senha</h2>
        <p style="color:#475569">Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
        <a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Redefinir senha
        </a>
        <p style="color:#94a3b8;font-size:12px">Se você não solicitou este link, ignore este email.</p>
      </div>
    `,
  });
}

export async function sendInviteEmail(email: string, inviterName: string, orgName: string, tempPassword: string): Promise<void> {
  if (isDev) {
    console.log(`\n[DEV] Convite para ${email} — Org: ${orgName} — Senha temporária: ${tempPassword}\n`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Você foi convidado para ${orgName} — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Convite para ${orgName}</h2>
        <p style="color:#475569">${inviterName} convidou você para acessar o ${APP_NAME}.</p>
        <p style="color:#475569">Acesse com:<br/><strong>Email:</strong> ${email}<br/><strong>Senha temporária:</strong> ${tempPassword}</p>
        <a href="${APP_URL}/login" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Fazer login
        </a>
        <p style="color:#94a3b8;font-size:12px">Recomendamos trocar sua senha após o primeiro acesso.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string, orgName: string): Promise<void> {
  if (isDev) {
    console.log(`\n[DEV] Bem-vindo ${name} (${email}) à organização ${orgName}\n`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Bem-vindo ao ${APP_NAME}!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Olá, ${name}!</h2>
        <p style="color:#475569">Sua conta na organização <strong>${orgName}</strong> foi criada com sucesso.</p>
        <a href="${APP_URL}/login" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Fazer login
        </a>
      </div>
    `,
  });
}
