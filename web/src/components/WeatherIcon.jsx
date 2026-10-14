import { conditionFromCode } from '../utils/weatherCondition.js';

const iconPaths = {
  clear: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </>
  ),
  cloudy: <path d="M19 17H6.5a4.5 4.5 0 1 1 .7-8.9 6.5 6.5 0 0 1 12.2 1.8A3.6 3.6 0 0 1 19 17Z" />,
  rain: (
    <>
      <path d="M18.5 16.5h-12a4.5 4.5 0 1 1 .7-8.9 6 6 0 0 1 11.3 1.5 3.8 3.8 0 0 1 0 7.4Z" />
      <path d="m9 19-1 2m6-2-1 2m6-2-1 2" />
    </>
  ),
  snow: (
    <>
      <path d="M18.5 15h-12a4.5 4.5 0 1 1 .7-8.9 6 6 0 0 1 11.3 1.5 3.8 3.8 0 0 1 0 7.4Z" />
      <path d="M8 19v3m-1.5-1.5h3m4.5-1.5v3m-1.5-1.5h3m4.5-1.5v3m-1.5-1.5h3" />
    </>
  ),
  storm: (
    <>
      <path d="M18.5 15h-12a4.5 4.5 0 1 1 .7-8.9 6 6 0 0 1 11.3 1.5 3.8 3.8 0 0 1 0 7.4Z" />
      <path d="m13 16-3 4h3l-1 3 4-5h-3l1-2" />
    </>
  )
};

export function WeatherIcon({ code, size = 24 }) {
  const condition = conditionFromCode(code);

  return (
    <svg
      className={`weather-icon weather-icon--${condition}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[condition]}
    </svg>
  );
}
