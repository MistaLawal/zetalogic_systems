// Single source of truth for company details and static Phase 1 content.
// In Phase 5 the editable parts (announcement, hours, socials) move to the
// `store_settings` table and are managed from the admin dashboard.

export const company = {
  name: 'Zetalogic Systems',
  tagline: 'Technology. Innovation. Business Growth.',
  statement:
    'Practical technology solutions that help businesses and individuals work smarter, operate efficiently, and grow confidently.',
  phoneDisplay: '0702 630 7814',
  phoneTel: '+2347026307814',
  whatsapp: '2347026307814',
  email: 'zetalogicsystems@gmail.com',
  // Placeholder street from the brief. Replace before launch.
  address: { street: 'xyz street', area: 'Ikorodu', city: 'Lagos', country: 'Nigeria' },
  addressIsPlaceholder: true,
  // Placeholder hours — confirm with the business. Admin-editable from Phase 5.
  hours: [
    { days: 'Monday – Friday', time: '9:00am – 6:00pm' },
    { days: 'Saturday', time: '10:00am – 4:00pm' },
    { days: 'Sunday', time: 'Closed' },
  ],
  hoursArePlaceholder: true,
  // Leave a value empty to hide that social link.
  socials: {
    instagram: '',
    linkedin: '',
    x: '',
    facebook: '',
  },
} as const;

export const announcement = {
  enabled: true,
  text: 'Need a laptop recommendation? Tell us your budget and work on WhatsApp and we will suggest options.',
  linkLabel: 'Chat with us',
};

export type NavItem = { label: string; to: string };

export const mainNav: NavItem[] = [
  { label: 'Store', to: '/store' },
  { label: 'IT Services', to: '/services' },
  { label: 'Web Development', to: '/services/web-development' },
  { label: 'Software', to: '/software' },
  { label: 'About', to: '/about' },
  { label: 'Insights', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

export type Category = { slug: string; name: string; blurb: string; icon: IconName };

export type IconName =
  | 'laptop' | 'refurb' | 'mouse' | 'key' | 'download' | 'network'
  | 'web' | 'app' | 'cog' | 'chart' | 'install' | 'server';

export const categories: Category[] = [
  { slug: 'new-laptops', name: 'New Laptops', blurb: 'Sealed machines for work, study and design, with manufacturer warranty.', icon: 'laptop' },
  { slug: 'used-refurbished-laptops', name: 'Used & Refurbished Laptops', blurb: 'Tested devices with the condition, battery health and warranty stated up front.', icon: 'refurb' },
  { slug: 'computer-accessories', name: 'Computer Accessories', blurb: 'Chargers, keyboards, mice, storage, bags and everyday add-ons.', icon: 'mouse' },
  { slug: 'software-licences', name: 'Software & Licences', blurb: 'Productivity, security and business software with activation guidance.', icon: 'key' },
  { slug: 'digital-products', name: 'Digital Products', blurb: 'Excel tools, templates, guides and business documents to download.', icon: 'download' },
  { slug: 'networking-it-equipment', name: 'Networking & IT Equipment', blurb: 'Routers, switches, cabling and kit for reliable office networks.', icon: 'network' },
];

export type Service = {
  slug: string;
  name: string;
  short: string;
  icon: IconName;
  intro: string;
  benefits: string[];
  scope: string[];
  process: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
};

const standardProcess = (build: string) => [
  { title: 'Discovery call', body: 'We talk through what you need, who will use it, your timeline and your budget in naira.' },
  { title: 'Proposal and quote', body: 'You get a written scope, deliverables, timeline and a fixed quote or clear rate before any work starts.' },
  { title: build, body: 'We do the work in agreed stages and share progress so you can give feedback early.' },
  { title: 'Handover and support', body: 'We hand over access, documentation and training, then stay available for agreed support.' },
];

export const services: Service[] = [
  {
    slug: 'web-development',
    name: 'Website Design & Development',
    short: 'Fast, mobile-first business websites and online stores that you can update yourself.',
    icon: 'web',
    intro:
      'Most of your customers will find you on a phone. We design and build websites that load quickly on Nigerian mobile networks, explain what you do clearly, and make it easy to call, chat on WhatsApp, book or buy.',
    benefits: [
      'A professional online presence that makes your business easier to trust',
      'Pages built for mobile data and smaller screens first',
      'Search-friendly structure so customers can find you on Google',
      'An editor you can use to change text, prices and images without a developer',
    ],
    scope: [
      'Company and portfolio websites',
      'Ecommerce stores with Paystack or Flutterwave payments',
      'Landing pages for campaigns and product launches',
      'Domain, hosting, business email and SSL setup',
      'Redesigns and speed improvements for existing sites',
    ],
    process: standardProcess('Design and build'),
    faqs: [
      { q: 'How long does a business website take?', a: 'A small company site usually takes two to four weeks once we have your content. Stores and larger sites take longer; your quote states the timeline.' },
      { q: 'Can I update the website myself?', a: 'Yes. We set up an editor for the parts you change often, and we show you how to use it during handover.' },
      { q: 'Do you handle domain and hosting?', a: 'We can register your domain, set up hosting and business email, or work with what you already have.' },
    ],
  },
  {
    slug: 'web-applications',
    name: 'Custom Web Applications',
    short: 'Portals, dashboards and internal tools built around how your team already works.',
    icon: 'app',
    intro:
      'When spreadsheets and WhatsApp groups stop keeping up, a custom web application can bring your records, approvals and reports into one place that staff and customers can reach from any device.',
    benefits: [
      'One system of record instead of scattered files',
      'Role-based access so people only see what they need',
      'Fewer manual steps and fewer errors',
      'Software that fits your process instead of forcing a new one',
    ],
    scope: [
      'Customer and staff portals',
      'Inventory, booking and order management systems',
      'Admin dashboards with reports and exports',
      'Integrations with payment, SMS and email services',
    ],
    process: standardProcess('Build in stages'),
    faqs: [
      { q: 'What does a custom application cost?', a: 'It depends on the features, users and integrations. After a discovery call we give a scoped quote in naira, and we can split larger builds into phases.' },
      { q: 'Who owns the code?', a: 'Ownership terms are written into your agreement. For most client builds, you own the delivered application.' },
    ],
  },
  {
    slug: 'it-consulting',
    name: 'IT Consulting & Business Automation',
    short: 'Clear technology advice and automations that remove repetitive work.',
    icon: 'cog',
    intro:
      'We look at how your business runs today, find the tasks that eat staff time, and recommend practical tools and automations that fit your size and budget.',
    benefits: [
      'Independent advice before you spend on hardware or software',
      'Automated invoices, reminders, reports and data entry',
      'A written plan you can act on in stages',
    ],
    scope: [
      'Technology audits and recommendations',
      'Workflow automation with Google Workspace, Microsoft 365 and similar tools',
      'Software selection and vendor comparison',
      'Process documentation and staff training',
    ],
    process: standardProcess('Implement and automate'),
    faqs: [
      { q: 'We are a small business. Is consulting worth it?', a: 'Often the biggest gains come from small changes, such as one automated report or a shared file system. We scope the engagement to the size of the problem.' },
      { q: 'Do you work on-site?', a: 'We work remotely and can visit within Lagos by arrangement.' },
    ],
  },
  {
    slug: 'data-analytics',
    name: 'Data Analytics & Business Intelligence',
    short: 'Excel models and Power BI dashboards that show what your numbers mean.',
    icon: 'chart',
    intro:
      'Your sales, stock and expense records already hold answers. We clean and structure that data, then build reports and dashboards your team can read and trust.',
    benefits: [
      'See sales, margins and stock in one view',
      'Spend less time building the same report every week',
      'Decisions based on figures rather than guesses',
    ],
    scope: [
      'Excel data cleaning, models and automated reports',
      'Power BI dashboards and data models',
      'KPI definition and reporting frameworks',
      'Training for staff who maintain the reports',
    ],
    process: standardProcess('Model and visualise'),
    faqs: [
      { q: 'Our data is messy. Can you still help?', a: 'Yes. Cleaning and structuring data is usually the first stage of the work.' },
      { q: 'Do we need Power BI licences?', a: 'Not always. Many reports work well in Excel. We recommend the simplest tool that meets your needs and explain any licence costs before you commit.' },
    ],
  },
  {
    slug: 'software-installation',
    name: 'Software Installation & Support',
    short: 'Setup, activation and troubleshooting for business and productivity software.',
    icon: 'install',
    intro:
      'We install and configure the software your team relies on, explain licensing in plain terms, and help when something stops working.',
    benefits: [
      'Software set up correctly the first time',
      'Clear guidance on licence types and renewals',
      'Help when updates or errors interrupt work',
    ],
    scope: [
      'Operating system and productivity suite installation',
      'Antivirus and endpoint security setup',
      'Accounting and business software configuration',
      'Remote troubleshooting and support',
    ],
    process: standardProcess('Install and configure'),
    faqs: [
      { q: 'Do you sell genuine licences?', a: 'Every licence we sell states its type, duration and source on the product page. Ask us before buying if you are unsure which licence fits your use.' },
    ],
  },
  {
    slug: 'it-support',
    name: 'IT Infrastructure & Computer Support',
    short: 'Office networks, device setup, maintenance and repairs.',
    icon: 'server',
    intro:
      'From a single laptop to an office network, we set up and maintain the equipment your work depends on, and we explain what we did and why.',
    benefits: [
      'Reliable internet and file sharing across the office',
      'Devices set up securely for new staff',
      'Fewer interruptions from preventable faults',
    ],
    scope: [
      'Office network and Wi-Fi setup',
      'Laptop and desktop setup, upgrades and repairs',
      'Backups and basic security hardening',
      'Ongoing support arrangements',
    ],
    process: standardProcess('Set up and test'),
    faqs: [
      { q: 'Can you upgrade my current laptop instead of replacing it?', a: 'Often, yes. RAM and SSD upgrades can extend a laptop’s useful life. We will tell you honestly when an upgrade is not worth it.' },
    ],
  },
];

export const values = [
  { title: 'Practical recommendations', body: 'We suggest what fits your work and budget, including when the cheaper option is the right one.' },
  { title: 'Professional delivery', body: 'Written quotes, agreed timelines and clear communication from start to handover.' },
  { title: 'Built around your needs', body: 'Solutions shaped by how your business runs, not by a fixed package.' },
  { title: 'For individuals and organisations', body: 'From a student’s first laptop to an office network, we support both.' },
  { title: 'Hardware, software and services together', body: 'Buy the device, the licence and the setup from one team that knows how they fit.' },
];

export const serviceOptions = services.map((s) => s.name).concat(['Something else']);
