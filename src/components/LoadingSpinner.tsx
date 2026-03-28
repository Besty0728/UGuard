export function LoadingSpinner({ className, size = "4em" }: { className?: string; size?: string }) {
  return (
    <div className={`flex items-center justify-center ${className ?? 'py-20'}`}>
      <svg className="loader-hourglass" style={{ width: size }} viewBox="0 0 250 500">
        <g stroke="#f59e0b" strokeWidth="12" strokeLinecap="round" fill="none">
          <g className="loader__motion-thick"> <path d="M125 450a200 200 0 1 1 0-400a200 200 0 1 1 0 400" strokeOpacity="0.1" /> <path d="M125 50a200 200 0 0 1 200 200" /> </g>
          <g className="loader__motion-medium"> <path d="M125 100a150 150 0 0 1 150 150" /> </g>
          <g className="loader__motion-thin"> <path d="M125 150a100 100 0 0 1 100 100" /> </g>
          <g className="loader__model">
            <path d="M40 80l170 0l-85 170l85 170l-170 0l85-170z" strokeWidth="8" />
            <path className="loader__sand-drop" d="M125 250v150" strokeDasharray="1 150" />
            <g className="loader__sand-mound-top"> <path className="loader__sand-fill" d="M50 90l150 0l-75 145z" fill="#f59e0b" stroke="none" /> </g>
            <g className="loader__sand-mound-bottom"> <path className="loader__sand-fill" d="M125 250l75 160l-150 0z" fill="#f59e0b" stroke="none" /> </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
