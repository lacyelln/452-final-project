import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

// Where the sign-in code is emailed from (the Gmail account configured in Supabase SMTP settings).
const SENDER = "cs110.aiflagtracker@gmail.com";

// The sign-in flow, shown when there is no session: enter email, then enter the emailed code.
// On success the session arrives through AuthProvider and App swaps this out for <Authenticated />.
export default function Unauthenticated() {
	const { sendCode, verifyCode } = useAuth();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [codeSent, setCodeSent] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSend(e: FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError(null);
		const err = await sendCode(email);
		setBusy(false);
		if (err) setError(err);
		else setCodeSent(true);
	}

	async function onVerify(e: FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError(null);
		const err = await verifyCode(email, code);
		setBusy(false);
		if (err) setError(err);
	}

	return codeSent ? (
		<form onSubmit={onVerify}>
			<p>
				We sent a sign-in code to <strong>{email}</strong>.
			</p>
			<p className="notice">
				<span className="notice-line">
					The code comes from <strong>{SENDER}</strong>.
				</span>
				It might land in <strong>Junk Email</strong> in Outlook, so check there if you don't see it.
			</p>
			<input
				className="code-input"
				value={code}
				onChange={(e) => setCode(e.target.value)}
				inputMode="numeric"
				autoComplete="one-time-code"
				placeholder="00000000"
				required
			/>
			<button className="btn" disabled={busy}>
				{busy ? "Checking..." : "Sign in"}
			</button>
			<button
				type="button"
				className="btn btn-secondary"
				onClick={() => {
					setCodeSent(false);
					setCode("");
					setError(null);
				}}
			>
				Use a different email
			</button>
			{error && <p className="error">{error}</p>}
		</form>
	) : (
		<form onSubmit={onSend}>
			<p className="muted">Enter your BYU email and we'll send you a one-time sign-in code.</p>
			<input
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="you@byu.edu"
				autoComplete="email"
				required
			/>
			<button className="btn" disabled={busy}>
				{busy ? "Sending..." : "Email me a code"}
			</button>
			{error && <p className="error">{error}</p>}
		</form>
	);
}
