
interface PasswordRequirementsProps {
  password: string;
}

export function isPasswordValid(password: string): boolean {
  return (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    password.length >= 8
  );
}

export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = [
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character (e.g. !?<>@#$%)', met: /[^A-Za-z0-9]/.test(password) },
    { label: '8 characters or more', met: password.length >= 8 },
  ];

  return (
    <ul className="mt-3.5 space-y-2.5 text-xs text-gray-500" aria-label="Password requirements">
      {requirements.map((req, index) => (
        <li
          key={index}
          className={`flex items-center gap-2.5 transition-all duration-300 ease-out ${
            req.met ? 'text-gray-950 font-medium' : 'text-gray-400'
          }`}
        >
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300 ease-out shrink-0 transform ${
              req.met ? 'bg-emerald-600 scale-105 shadow-xs' : 'bg-gray-300 scale-100'
            }`}
          >
            <svg
              className="w-3 h-3 text-white transition-opacity duration-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="transition-colors duration-300">{req.label}</span>
        </li>
      ))}
    </ul>
  );
}
