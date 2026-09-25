const PILOT_MESSAGE = `🚀 You’re invited to try SkulGo — a new lightweight school record platform built for Nigerian schools.

SkulGo is designed to make school records simple, connected and secure. Instead of teachers, administrators, parents and students keeping disconnected records, SkulGo connects the school structure, people, attendance, scores, results and fees in one place — while each person only sees the work and records allowed for their role.

Teachers can manage their assigned classes, subjects, attendance and scores. Admins can manage the school structure, approve people and connect teachers to their duties. Parents and students can access their own school records. SkulGo is also built to keep working when internet connectivity is poor and sync when the connection returns.

We are currently opening SkulGo for real pilot users. We would really value your experience, feedback and honest opinion while we improve it.

🌐 Visit: https://skulgo.com

If you are interested, create a personal account and explore it. You can also share it with a teacher, school administrator, parent or student who may want to participate in the pilot.

Referral ID: {{REFERRAL_ID}}

If you create your account, you can enter this Referral ID during registration.

SkulGo — Transparent & Secure Records.`;

export function buildReferralPilotMessage(referralCode: string) {
  return PILOT_MESSAGE.replace("{{REFERRAL_ID}}", referralCode);
}

export function buildReferralLink(referralCode: string) {
  return `https://skulgo.com/?ref=${encodeURIComponent(referralCode)}`;
}
