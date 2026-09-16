import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { io } from 'socket.io-client';
import { getAuthClient } from './firebase';
import { Terms } from './Terms';

type Comment = { id: number; mensagem: string; criadoEm: string; autor: string; pais?: string };
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const videoId = import.meta.env.VITE_YOUTUBE_VIDEO_ID || 'dQw4w9WgXcQ';
const consentKey = 'alpha-pit-cookie-consent';

// URL da bandeira em imagem (funciona em qualquer SO/navegador, ao contrário do emoji)
function flagUrlFromCode(code?: string) {
  if (!code || code.length !== 2) return '';
  return `https://flagcdn.com/48x36/${code.toLowerCase()}.png`;
}

// Lista completa e fixa de países — não depende de suporte do navegador
const ALL_COUNTRIES: [string, string][] = [
  ['AF', 'Afghanistan'], ['AL', 'Albania'], ['DZ', 'Algeria'], ['AD', 'Andorra'], ['AO', 'Angola'],
  ['AG', 'Antigua and Barbuda'], ['AR', 'Argentina'], ['AM', 'Armenia'], ['AU', 'Australia'], ['AT', 'Austria'],
  ['AZ', 'Azerbaijan'], ['BS', 'Bahamas'], ['BH', 'Bahrain'], ['BD', 'Bangladesh'], ['BB', 'Barbados'],
  ['BY', 'Belarus'], ['BE', 'Belgium'], ['BZ', 'Belize'], ['BJ', 'Benin'], ['BT', 'Bhutan'],
  ['BO', 'Bolivia'], ['BA', 'Bosnia and Herzegovina'], ['BW', 'Botswana'], ['BR', 'Brazil'], ['BN', 'Brunei'],
  ['BG', 'Bulgaria'], ['BF', 'Burkina Faso'], ['BI', 'Burundi'], ['CV', 'Cabo Verde'], ['KH', 'Cambodia'],
  ['CM', 'Cameroon'], ['CA', 'Canada'], ['CF', 'Central African Republic'], ['TD', 'Chad'], ['CL', 'Chile'],
  ['CN', 'China'], ['CO', 'Colombia'], ['KM', 'Comoros'], ['CG', 'Congo'], ['CD', 'Congo (DRC)'],
  ['CR', 'Costa Rica'], ['CI', "Côte d'Ivoire"], ['HR', 'Croatia'], ['CU', 'Cuba'], ['CY', 'Cyprus'],
  ['CZ', 'Czechia'], ['DK', 'Denmark'], ['DJ', 'Djibouti'], ['DM', 'Dominica'], ['DO', 'Dominican Republic'],
  ['EC', 'Ecuador'], ['EG', 'Egypt'], ['SV', 'El Salvador'], ['GQ', 'Equatorial Guinea'], ['ER', 'Eritrea'],
  ['EE', 'Estonia'], ['SZ', 'Eswatini'], ['ET', 'Ethiopia'], ['FJ', 'Fiji'], ['FI', 'Finland'],
  ['FR', 'France'], ['GA', 'Gabon'], ['GM', 'Gambia'], ['GE', 'Georgia'], ['DE', 'Germany'],
  ['GH', 'Ghana'], ['GR', 'Greece'], ['GD', 'Grenada'], ['GT', 'Guatemala'], ['GN', 'Guinea'],
  ['GW', 'Guinea-Bissau'], ['GY', 'Guyana'], ['HT', 'Haiti'], ['HN', 'Honduras'], ['HK', 'Hong Kong'],
  ['HU', 'Hungary'], ['IS', 'Iceland'], ['IN', 'India'], ['ID', 'Indonesia'], ['IR', 'Iran'],
  ['IQ', 'Iraq'], ['IE', 'Ireland'], ['IL', 'Israel'], ['IT', 'Italy'], ['JM', 'Jamaica'],
  ['JP', 'Japan'], ['JO', 'Jordan'], ['KZ', 'Kazakhstan'], ['KE', 'Kenya'], ['KI', 'Kiribati'],
  ['XK', 'Kosovo'], ['KW', 'Kuwait'], ['KG', 'Kyrgyzstan'], ['LA', 'Laos'], ['LV', 'Latvia'],
  ['LB', 'Lebanon'], ['LS', 'Lesotho'], ['LR', 'Liberia'], ['LY', 'Libya'], ['LI', 'Liechtenstein'],
  ['LT', 'Lithuania'], ['LU', 'Luxembourg'], ['MO', 'Macao'], ['MG', 'Madagascar'], ['MW', 'Malawi'],
  ['MY', 'Malaysia'], ['MV', 'Maldives'], ['ML', 'Mali'], ['MT', 'Malta'], ['MH', 'Marshall Islands'],
  ['MR', 'Mauritania'], ['MU', 'Mauritius'], ['MX', 'Mexico'], ['FM', 'Micronesia'], ['MD', 'Moldova'],
  ['MC', 'Monaco'], ['MN', 'Mongolia'], ['ME', 'Montenegro'], ['MA', 'Morocco'], ['MZ', 'Mozambique'],
  ['MM', 'Myanmar'], ['NA', 'Namibia'], ['NR', 'Nauru'], ['NP', 'Nepal'], ['NL', 'Netherlands'],
  ['NZ', 'New Zealand'], ['NI', 'Nicaragua'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['KP', 'North Korea'],
  ['MK', 'North Macedonia'], ['NO', 'Norway'], ['OM', 'Oman'], ['PK', 'Pakistan'], ['PW', 'Palau'],
  ['PS', 'Palestine'], ['PA', 'Panama'], ['PG', 'Papua New Guinea'], ['PY', 'Paraguay'], ['PE', 'Peru'],
  ['PH', 'Philippines'], ['PL', 'Poland'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['QA', 'Qatar'],
  ['RO', 'Romania'], ['RU', 'Russia'], ['RW', 'Rwanda'], ['KN', 'Saint Kitts and Nevis'], ['LC', 'Saint Lucia'],
  ['VC', 'Saint Vincent and the Grenadines'], ['WS', 'Samoa'], ['SM', 'San Marino'], ['ST', 'São Tomé and Príncipe'],
  ['SA', 'Saudi Arabia'], ['SN', 'Senegal'], ['RS', 'Serbia'], ['SC', 'Seychelles'], ['SL', 'Sierra Leone'],
  ['SG', 'Singapore'], ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['SB', 'Solomon Islands'], ['SO', 'Somalia'],
  ['ZA', 'South Africa'], ['KR', 'South Korea'], ['SS', 'South Sudan'], ['ES', 'Spain'], ['LK', 'Sri Lanka'],
  ['SD', 'Sudan'], ['SR', 'Suriname'], ['SE', 'Sweden'], ['CH', 'Switzerland'], ['SY', 'Syria'],
  ['TW', 'Taiwan'], ['TJ', 'Tajikistan'], ['TZ', 'Tanzania'], ['TH', 'Thailand'], ['TL', 'Timor-Leste'],
  ['TG', 'Togo'], ['TO', 'Tonga'], ['TT', 'Trinidad and Tobago'], ['TN', 'Tunisia'], ['TR', 'Turkey'],
  ['TM', 'Turkmenistan'], ['TV', 'Tuvalu'], ['UG', 'Uganda'], ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'],
  ['GB', 'United Kingdom'], ['US', 'United States'], ['UY', 'Uruguay'], ['UZ', 'Uzbekistan'], ['VU', 'Vanuatu'],
  ['VA', 'Vatican City'], ['VE', 'Venezuela'], ['VN', 'Vietnam'], ['YE', 'Yemen'], ['ZM', 'Zambia'],
  ['ZW', 'Zimbabwe'],
];

function useCountries() {
  return useMemo(
    () => ALL_COUNTRIES.map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
}

function CountryField({ value, code, onChange }: { value: string; code: string; onChange: (name: string, code: string) => void }) {
  const countries = useCountries();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return countries.filter(c => c.name.toLowerCase().includes(query)).slice(0, 8);
  }, [value, countries]);

  return (
    <div className="country-field" ref={wrapRef}>
      <input
        id="country"
        value={value}
        onChange={e => { onChange(e.target.value, ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search your country…"
        autoComplete="off"
        required
      />
      {open && filtered.length > 0 && (
        <ul className="country-dropdown">
          {filtered.map(c => (
            <li key={c.code} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(c.name, c.code); setOpen(false); }}>
              <img src={flagUrlFromCode(c.code)} alt="" width={18} height={13} /> {c.name}
            </li>
          ))}
        </ul>
      )}
      {value && !code && filtered.length === 0 && <small className="field-hint">No country found.</small>}
      {value && !code && filtered.length > 0 && !open && <small className="field-hint">Pick a country from the list.</small>}
    </div>
  );
}

export default function App() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [current, setCurrent] = useState(0);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/api/comments`).then(r => r.ok ? r.json() : []).then(setComments).catch(() => setNotice('Could not load comments right now.'));
    const socket = io(apiUrl);
    socket.on('comment:created', (comment: Comment) => setComments(items => [...items, comment]));
    socket.on('comment:hidden', ({ id }: { id: number }) => setComments(items => items.filter(item => item.id !== id)));
    return () => { socket.disconnect(); };
  }, []);
  useEffect(() => {
    setHasConsent(localStorage.getItem(consentKey) === 'accepted');
  }, []);
  useEffect(() => {
    if (!hasConsent) return;
    const auth = getAuthClient();
    return auth ? onAuthStateChanged(auth, setUser) : undefined;
  }, [hasConsent]);
  useEffect(() => {
    if (!hasConsent) return;
    const storageKey = 'alpha-pit-session-id';
    let sessaoId = localStorage.getItem(storageKey);
    if (!sessaoId) { sessaoId = crypto.randomUUID(); localStorage.setItem(storageKey, sessaoId); }
    fetch(`${apiUrl}/api/accesses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessaoId, aceitouTermos: true }) }).catch(() => undefined);
  }, [hasConsent]);
  useEffect(() => {
    if (!comments.length) return;
    const timer = window.setInterval(() => setCurrent(value => (value + 1) % comments.length), 5200);
    return () => window.clearInterval(timer);
  }, [comments.length]);
  const activeComment = useMemo(() => comments[current % Math.max(comments.length, 1)], [comments, current]);

  const canSubmit = Boolean(user) && countryCode.length > 0 && message.trim().length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !user) return;
    const token = await user.getIdToken();
    const response = await fetch(`${apiUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mensagem: message, pais: countryCode, aceitouTermos: true }),
    });
    if (!response.ok) return setNotice('Could not post your comment. Confirm your email and try again.');
    setMessage('');
    setNotice('Comment sent for moderation. Thanks for cheering with Alpha!');
  }

  function acceptCookies() {
    localStorage.setItem(consentKey, 'accepted');
    setHasConsent(true);
  }

  async function signIn() {
    const auth = getAuthClient();
    if (auth) await signInWithPopup(auth, new GoogleAuthProvider());
  }

  return <main>
    <header className="topbar"><img src="/assets/Logo Alpha Com Contorno (1).png" alt="Alpha Scuderia" /><div><p>WE ARE ONE</p><span>ALPHA SCUDERIA · STEM RACING</span></div></header>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">INTERACTIVE MUSIC VIDEO</span><h1>One team.<br /><em>One voice.</em></h1><p>Watch the video and leave your message for Alpha Scuderia.</p><img className="hero-mascot" src="/assets/alpha uniforme 3k v2.png" alt="Alphie, Alpha Scuderia's mascot" /></div>
      <div className="player-wrap"><div className="player"><iframe title="WE ARE ONE - Alpha Scuderia" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        {activeComment && (
          <aside className="bubble">
            <span className="bubble-flag">
              <span className="flag-code">{activeComment.pais}</span>
              <img className="flag-emoji" src={flagUrlFromCode(activeComment.pais)} alt={activeComment.pais} />
            </span>
            <div>
              <strong className="bubble-autor">{activeComment.autor}</strong>
              <p className="bubble-message">{activeComment.mensagem}</p>
            </div>
          </aside>
        )}
      </div><p className="player-note">Live comments appear here ✦</p></div>
    </section>
    <section className="interact"><img src="/assets/alphie animado.png" alt="Animated Alphie" /><div><span className="eyebrow">LEAVE YOUR MARK</span><h2>Be part of this moment.</h2>
      <form onSubmit={submit}>
        <fieldset className="about-you">
          <legend>Tell us about you</legend>
          {user ? <><p>Posting as <strong>{user.displayName || user.email}</strong></p><button type="button" onClick={() => { const auth = getAuthClient(); if (auth) void signOut(auth); }}>Sign out</button></> : <button type="button" onClick={() => void signIn()} disabled={!hasConsent}>Sign in with Google to comment</button>}
          <label htmlFor="country">Your country</label>
          <CountryField
            value={countryQuery}
            code={countryCode}
            onChange={(text, code) => { setCountryQuery(text); setCountryCode(code); }}
          />
        </fieldset>
        <label htmlFor="comment">Your comment <span className="character-count">{message.length}/280</span></label>
        <div className="form-row"><input id="comment" value={message} onChange={e => setMessage(e.target.value)} maxLength={280} placeholder="Write your message to the team…" required /><button type="submit" disabled={!canSubmit}>Send <span>→</span></button></div>
      </form>
      {notice && <p role="status" className="notice">{notice}</p>}
    </div><img className="trophy" src="/assets/trofeu-alphie.png" alt="Alphie with trophy" /></section>
    <footer><img src="/assets/Logo Alpha Com Contorno (1).png" alt="Alpha Scuderia" /><p>© 2026 Alpha Scuderia · STEM Racing</p><button className="footer-link" type="button" onClick={() => setShowTerms(true)}>Terms and cookies</button><a href="/admin">Admin area</a></footer>
    {hasConsent === false && <section className="consent-banner" role="dialog" aria-label="Cookies"><p>Usamos cookies opcionais somente para métricas e login após o seu aceite.</p><button type="button" onClick={() => setShowTerms(true)}>Read terms</button><button type="button" onClick={acceptCookies}>Accept cookies</button></section>}
    {showTerms && <section className="terms-dialog" role="dialog" aria-modal="true" aria-label="Terms and cookies"><div><button className="terms-close" type="button" onClick={() => setShowTerms(false)}>Close</button><Terms /></div></section>}
  </main>;
}
