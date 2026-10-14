export function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      className="theme-toggle"
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={onToggle}
    >
      <span className="toggle-knob" aria-hidden="true">
        {isDark ? '☾' : '☼'}
      </span>
    </button>
  );
}
