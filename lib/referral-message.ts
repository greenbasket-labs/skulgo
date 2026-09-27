const PILOT_MESSAGE = `🚀 You’re invited to try SkulGo — a new school record system built for Nigerian schools.

SkulGo is a lightweight connected record book for Nigerian schools.

It makes school records simple, connected and secure. Instead of teachers, school proprietors/proprietresses, parents and students keeping disconnected records, SkulGo connects the school structure, people, attendance, scores, results and fees in one place — while each person only sees the work and records relevant to their role.

Teachers can manage their assigned classes, subjects, attendance and scores. Admins can manage the school structure, approve people and connect teachers to their duties. Parents and students can access their own school records. SkulGo is also built to keep working when internet connectivity is poor and sync when connectivity is restored.

We are currently opening SkulGo to pilot schools and users. We would really value your experience, feedback and honest opinion as we continue to improve it.

🌐 Visit: {{REFERRAL_LINK}}

If you are interested, create a personal account and explore SkulGo. You can also share it with a teacher, school proprietor/proprietress, parent or student who may want to participate in the pilot.

Referral ID: {{REFERRAL_ID}}

If you create your account, you can enter this Referral ID during registration.

SkulGo — Connected. Transparent. Secure Records.`;

export function buildReferralPilotMessage(referralCode: string) {
  const referralLink = buildReferralLink(referralCode);
  return PILOT_MESSAGE
    .replace("{{REFERRAL_ID}}", referralCode)
    .replace("{{REFERRAL_LINK}}", referralLink);
}

export function buildReferralLink(referralCode: string) {
  return `https://skulgo.com/?ref=${encodeURIComponent(referralCode)}`;
}
