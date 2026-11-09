import type { SVGProps } from 'react'

const paths = {
  trash: 'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  cooking: 'M3 10h18M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8M2 12h3m14 0h3M7 10a5 5 0 0 1 10 0m-5-6V2M8 5c-2-2 1-2 0-4m8 4c-2-2 1-2 0-4',
  cutlery: 'M4 3v6m3-6v6M4 6h3M5.5 9v12M18 3c-3 3-4 7-4 10h4m0-10v18',
  receipt: 'M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6m-6 4h6m-6 4h3',
  refresh: 'M20 7v5h-5M4 17v-5h5m-4-3a7 7 0 0 1 12-4l3 7M4 12l3 7a7 7 0 0 0 12-4',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  bag: 'M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1',
  queue: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  menu: 'M4 3h16v18H4V3Zm4 5h8M8 12h8M8 16h4',
  toppings: 'M7 4h10M8 4V2h8v2M6 8h12l2 13H4L6 8Zm4 4h4m-4 4h4',
  store: 'M3 10h18l-2-7H5l-2 7Zm2 0v11h14V10M9 21v-7h6v7',
  chart: 'M4 3v18h17M8 16v-5m5 5V7m5 9V4',
  qr: 'M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h2v2h4v4h-6v-6Z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5h4l1 3 3-1 2 3-2 3 2 3-2 3-3-1-1 3h-4l-1-3-3 1-2-3 2-3-2-3 2-3 3 1 1-3Z',
  users: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 1a4 4 0 0 1 0 8m1 3a4 4 0 0 1 3 4v2',
  message: 'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4ZM8 10h8m-8 4h5',
  shield: 'm12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Zm-4 9 3 3 5-5',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  switch: 'M4 8h15m-4-4 4 4-4 4m5 4H5m4-4-4 4 4 4',
  back: 'M20 12H4m6-6-6 6 6 6',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-8-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 5h18M8 3v4m8-4v4',
  login: 'M9 3h11v18H9M3 12h12m-4-4 4 4-4 4',
  user: 'M20 21v-3a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v3M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  bell: 'M5 17h14l-2-4V8a5 5 0 0 0-10 0v5l-2 4Zm5 4h4',
  pause: 'M8 5v14M16 5v14',
  play: 'm7 4 14 8-14 8V4Z',
  check: 'm5 12 4 4L19 6',
  logout: 'M9 3H4v18h5m4-14 5 5-5 5m-5-5h14',
  bars: 'M4 6h16M4 12h16M4 18h16',
} satisfies Record<string, string>

export type IconName = keyof typeof paths
export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>
}
