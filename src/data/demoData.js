/**
 * demoData.js
 * ───────────
 * Pre-built demo examples covering different real-world scenarios:
 *  1. History/Physics (Einstein Nobel Prize - High Contradiction/Hallucination)
 *  2. Technology & Computing (Invention of World Wide Web - Highly Factual)
 *  3. Medicine & Health (Antibiotics & Viruses - Severe Medical Hallucination)
 *  4. Space & Astronomy (Apollo 11 Moon Landing - Mixed / Partially Hallucinated)
 *  5. General Science (Water Boiling Point & Altitude - Physics Fact Checking)
 */

export const DEMO_EXAMPLES = [
  {
    id: 'einstein',
    title: 'Albert Einstein (Nobel Prize Hallucination)',
    category: 'Physics & History',
    expectedLabel: 'Partially Hallucinated',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    query: 'Why did Albert Einstein receive the Nobel Prize?',
    aiResponse:
      'Albert Einstein received the 1921 Nobel Prize in Physics for developing the theory of relativity. ' +
      'His groundbreaking work on general relativity directly resulted in the Nobel Prize. ' +
      'Einstein published the special theory of relativity in 1905. ' +
      'He also contributed to quantum mechanics through his explanation of the photoelectric effect. ' +
      'Einstein was born in Ulm, Germany in 1879.',
    reference:
      'The Nobel Prize in Physics 1921 was awarded to Albert Einstein for his services to theoretical physics, ' +
      'and especially for his discovery of the law of the photoelectric effect. ' +
      'The photoelectric effect describes the emission of electrons from a surface when light shines upon it, ' +
      'and Einstein\'s 1905 paper on this topic was foundational. ' +
      'Einstein was born on 14 March 1879 in Ulm, in the Kingdom of Württemberg in the German Empire. ' +
      'While Einstein is popularly associated with the theory of relativity, the Nobel Committee did not cite relativity as the primary reason for the award.',
  },
  {
    id: 'medical',
    title: 'Antibiotics vs Common Cold (Medical Hallucination)',
    category: 'Healthcare & Medicine',
    expectedLabel: 'Hallucinated',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    query: 'Can antibiotics effectively cure influenza or the common cold?',
    aiResponse:
      'Antibiotics like amoxicillin and azithromycin are widely prescribed to directly eradicate influenza viruses. ' +
      'Taking antibiotics during a cold speeds up viral clearance within 48 hours. ' +
      'Overuse of antibiotics causes no significant risk to the patient. ' +
      'Influenza is caused by viral strains affecting the respiratory system.',
    reference:
      'Antibiotics are solely effective against bacterial infections and do not kill or affect viruses. ' +
      'Influenza and the common cold are viral infections; therefore, antibiotics have no beneficial effect on them. ' +
      'Taking antibiotics for viral illnesses does not speed recovery and can cause adverse side effects. ' +
      'Widespread overuse of antibiotics leads directly to antimicrobial resistance, a major global public health crisis.',
  },
  {
    id: 'web',
    title: 'Invention of the Web (High Factual Accuracy)',
    category: 'Technology & Internet',
    expectedLabel: 'Factual',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    query: 'Who invented the World Wide Web and when?',
    aiResponse:
      'Tim Berners-Lee invented the World Wide Web in 1989 while working at CERN. ' +
      'He wrote the first web proposal to allow scientists to share information worldwide. ' +
      'Berners-Lee developed the first web browser and the first web server on a NeXT computer. ' +
      'The World Wide Web was made publicly accessible and royalty-free in 1993.',
    reference:
      'English scientist Sir Tim Berners-Lee invented the World Wide Web in 1989 at CERN, the European nuclear research agency. ' +
      'His initial March 1989 proposal was titled Information Management: A Proposal. ' +
      'In late 1990, he implemented the first web browser, WorldWideWeb, on a NeXT workstation. ' +
      'In April 1993, CERN announced that the World Wide Web technology would be available to everyone on a royalty-free basis.',
  },
  {
    id: 'apollo11',
    title: 'Apollo 11 Moon Landing (Mixed / Unsupported Claims)',
    category: 'Space Exploration',
    expectedLabel: 'Partially Hallucinated',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    query: 'Tell me about the Apollo 11 moon landing mission.',
    aiResponse:
      'Apollo 11 landed American astronauts on the Moon on July 20, 1969. ' +
      'Neil Armstrong was the first person to walk on the lunar surface. ' +
      'Buzz Aldrin accompanied Armstrong onto the surface twenty minutes later. ' +
      'The Apollo 11 lunar module spent over 72 hours continuously exploring the lunar highlands. ' +
      'Michael Collins remained in lunar orbit aboard the command module Columbia.',
    reference:
      'Apollo 11 was the American spaceflight that first landed humans on the Moon on July 20, 1969. ' +
      'Commander Neil Armstrong and Lunar Module Pilot Buzz Aldrin landed the Apollo Lunar Module Eagle. ' +
      'Armstrong became the first person to step onto the lunar surface six hours later, joined by Aldrin 19 minutes afterwards. ' +
      'They spent about two and a quarter hours outside the spacecraft and total surface duration was only 21.5 hours in the Sea of Tranquility, not the highlands. ' +
      'Michael Collins flew the Command Module Columbia alone in lunar orbit.',
  },
  {
    id: 'boiling',
    title: 'Boiling Point of Water & Altitude (Scientific Facts)',
    category: 'Physics & Chemistry',
    expectedLabel: 'Factual',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    query: 'How does atmospheric pressure and elevation affect water boiling point?',
    aiResponse:
      'At standard sea-level atmospheric pressure, water boils at 100 degrees Celsius or 212 degrees Fahrenheit. ' +
      'As altitude increases, atmospheric pressure decreases. ' +
      'Because of lower pressure at high elevations, water boils at a lower temperature than 100 degrees Celsius. ' +
      'Food cooked in boiling water at high altitude typically requires longer cooking times.',
    reference:
      'Standard atmospheric pressure at sea level corresponds to a boiling point for pure water of 100 °C (212 °F). ' +
      'With increasing altitude, the atmospheric pressure decreases substantially. ' +
      'Consequently, the boiling point of water drops as elevation increases, meaning liquid water boils at temperatures below 100 °C. ' +
      'Because water boils at a lower temperature in mountainous areas, cooking foods via boiling takes noticeably longer.',
  }
];

// Backwards compatibility for single demo input
export const DEMO_INPUT = DEMO_EXAMPLES[0];

export const SEED_HISTORY = [
  {
    id: 'h1',
    timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
    query: 'What causes climate change?',
    claimsCount: 4,
    overallScore: 82,
    stats: { supported: 3, unsupported: 0, contradictory: 0, uncertain: 1, hallucinationRisk: 0 },
    summary: 'The AI response contains 4 factual claims. 3 claims are supported by the available evidence. 1 claim is flagged as uncertain. The overall reliability score is 82/100 (mostly reliable).',
    claims: [],
  },
  {
    id: 'h2',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    query: 'Explain the process of photosynthesis.',
    claimsCount: 5,
    overallScore: 91,
    stats: { supported: 5, unsupported: 0, contradictory: 0, uncertain: 0, hallucinationRisk: 0 },
    summary: 'The AI response contains 5 factual claims. All 5 claims are supported by the available evidence. The overall reliability score is 91/100 (highly reliable).',
    claims: [],
  },
  {
    id: 'h3',
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    query: 'Who invented the telephone?',
    claimsCount: 3,
    overallScore: 68,
    stats: { supported: 1, unsupported: 1, contradictory: 1, uncertain: 0, hallucinationRisk: 33 },
    summary: 'The AI response contains 3 factual claims. 1 claim is supported, 1 lacks evidence, and 1 appears to contradict trusted information. Manual verification recommended.',
    claims: [],
  },
  {
    id: 'h4',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    query: 'Describe the French Revolution.',
    claimsCount: 6,
    overallScore: 78,
    stats: { supported: 4, unsupported: 1, contradictory: 0, uncertain: 1, hallucinationRisk: 0 },
    summary: 'The AI response contains 6 factual claims. 4 claims are supported, 1 lacks evidence, and 1 is uncertain. Mostly reliable.',
    claims: [],
  },
  {
    id: 'h5',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    query: 'What are the health benefits of green tea?',
    claimsCount: 5,
    overallScore: 54,
    stats: { supported: 2, unsupported: 2, contradictory: 1, uncertain: 0, hallucinationRisk: 20 },
    summary: 'The AI response contains 5 factual claims. 2 supported, 2 unsupported, 1 contradictory. Needs verification.',
    claims: [],
  },
];

export const ANALYTICS_TRENDS = [
  { label: 'Analysis 1', hallucinationRate: 0,  reliabilityScore: 91 },
  { label: 'Analysis 2', hallucinationRate: 33, reliabilityScore: 68 },
  { label: 'Analysis 3', hallucinationRate: 0,  reliabilityScore: 82 },
  { label: 'Analysis 4', hallucinationRate: 0,  reliabilityScore: 78 },
  { label: 'Analysis 5', hallucinationRate: 20, reliabilityScore: 54 },
  { label: 'Analysis 6', hallucinationRate: 10, reliabilityScore: 72 },
  { label: 'Analysis 7', hallucinationRate: 5,  reliabilityScore: 87 },
  { label: 'Analysis 8', hallucinationRate: 25, reliabilityScore: 63 },
];
