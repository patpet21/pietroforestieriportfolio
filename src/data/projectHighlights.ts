/**
 * Short, accurate copy for the public portfolio.
 * Avoids presenting research concepts and prototypes as fully operational products.
 */
export type ProjectHighlight = {
  shortTitle: string;
  what: string;
  solves: string;
  teaser: string;
  stage: string;
};

export const projectHighlights: Record<string, ProjectHighlight> = {
  privacygate: {
    shortTitle: 'PrivacyGate',
    what: 'A local-first desktop privacy tool, with browser and Gmail integrations at different stages of development.',
    solves: 'Helps reduce the risk of exposing names, personal details and other sensitive information when working with AI.',
    teaser: 'Protect sensitive information before sharing it with AI tools.',
    stage: 'Desktop published · Integrations in testing'
  },
  privatestone: {
    shortTitle: 'PrivateStone',
    what: 'A professional, request-led platform concept for off-market real estate opportunities.',
    solves: 'Explores a more structured and private alternative to fragmented property requests and informal introductions.',
    teaser: 'Organizing private real estate demand for verified professionals.',
    stage: 'In development'
  },
  propertydex: {
    shortTitle: 'PropertyDEX',
    what: 'Independent research into property structuring, digital ownership and real estate tokenization.',
    solves: 'Helps examine complex ownership models and digital workflow assumptions before proposing technological solutions.',
    teaser: 'Exploring the intersection of property, ownership and blockchain.',
    stage: 'Research and concept validation'
  },
  'propertydex-framework': {
    shortTitle: 'PropertyDEX Framework',
    what: 'An evolving framework concept for evaluating property-related projects and possible scenarios.',
    solves: 'Organizes scattered assumptions, information and decisions into a repeatable early-stage analysis process.',
    teaser: 'From scattered information to structured project decisions.',
    stage: 'Research and prototype'
  },
  websites: {
    shortTitle: 'Websites & Booking',
    what: 'Responsive website and booking-flow concepts for local services and premium hospitality.',
    solves: 'Helps visitors understand an offering and find a clearer path to contacting a business or requesting a booking.',
    teaser: 'Clearer digital experiences for real-world businesses.',
    stage: 'Demos and prototypes'
  },
  'retail-it': {
    shortTitle: 'NYC Retail IT Coordination',
    what: 'Hands-on technical and vendor coordination for a retail store in New York City.',
    solves: 'Keeps network, device and vendor issues organized while minimizing disruption to ongoing store operations.',
    teaser: 'Coordinating technology improvements around an operating store.',
    stage: 'Work completed · Follow-up pending'
  },
  'n8n-automation': {
    shortTitle: 'n8n Workflow Automation',
    what: 'A documented n8n publishing and Google Drive cleanup experiment with scheduled and conditional workflow branches.',
    solves: 'Demonstrates how verification and decision gates can make repetitive operational work easier to audit.',
    teaser: 'Scheduled workflows, verification and guarded file cleanup.',
    stage: 'Workflow experiment · Separate from NYC Retail IT'
  },
  'lead-rescue': {
    shortTitle: 'Lead Rescue',
    what: 'An experimental workflow concept for identifying incoming enquiries and potential response delays.',
    solves: 'Explores how to flag leads that might otherwise be overlooked across inboxes and business forms.',
    teaser: 'Spotting enquiries that could slip through the cracks.',
    stage: 'Prototype · Validation paused'
  },
  'e-learning': {
    shortTitle: 'E-Learning & AI PM Lab',
    what: 'A private learning-platform interface prototype alongside a separate AI PM Lab resource website.',
    solves: 'Explores clearer ways to organize lessons, prompts, PDF guides and practical project-management learning.',
    teaser: 'Making practical learning resources easier to discover.',
    stage: 'Platform prototype · Resource site published'
  }
};
