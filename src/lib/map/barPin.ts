export type BarPinType = 'customer' | 'nonCustomer';

function svgToDataUrl(svg: string) {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
}

export function getBarPinIcon(type: BarPinType): string {
  const showStar = type === 'customer';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg"
       viewBox="0 0 24 24"
       fill="#FFFFFF"
       stroke="#111111"
       stroke-width="1.8">

    <!-- Pin shape -->
    <path stroke-linecap="round"
          stroke-linejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />

    <!-- Inner circle -->
    <path stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />

    ${showStar ? `
      <path d="M11.48 6.5
               a.4.4 0 0 1 .74 0
               l1.2 2.9
               a.4.4 0 0 0 .33.24
               l3.1.25
               c.28.02.39.37.18.55
               l-2.36 2.02
               a.4.4 0 0 0-.13.4
               l.72 3
               a.4.4 0 0 1-.6.44
               l-2.65-1.6
               a.4.4 0 0 0-.33 0
               l-2.65 1.6
               a.4.4 0 0 1-.6-.44
               l.72-3
               a.4.4 0 0 0-.13-.4
               l-2.36-2.02
               c-.21-.18-.1-.53.18-.55
               l3.1-.25
               a.4.4 0 0 0 .33-.24
               l1.2-2.9Z"
            fill="#16a34a"
            stroke="none"/>
    ` : ''}

  </svg>
  `;

  return svgToDataUrl(svg);
}

