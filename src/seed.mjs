// Blooket Enhanced v2 — 30 official question sets shown on Discover.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Format: [question, [correct answer, wrong, wrong, wrong]] — the correct answer is written first
// and the answers are shuffled (deterministically) when the set is created.
// Sets are only added if missing, so teachers' and students' own data is never touched, and an
// official set an admin deleted is not re-added unless SEED_VERSION goes up.

export const OFFICIAL_ID = 'official';
const SEED_VERSION = 1;

const SETS = [
  { slug: 'multiplication', title: 'Multiplication Facts', subject: 'Math', color: '#ffa31e', description: 'Quick-fire times tables from 2 to 12.', q: [
    ['7 × 8 = ?', ['56', '54', '48', '64']], ['6 × 9 = ?', ['54', '56', '45', '63']], ['12 × 12 = ?', ['144', '124', '132', '154']],
    ['4 × 7 = ?', ['28', '24', '32', '21']], ['9 × 9 = ?', ['81', '72', '99', '89']], ['8 × 6 = ?', ['48', '42', '56', '46']],
    ['11 × 7 = ?', ['77', '71', '87', '67']], ['3 × 12 = ?', ['36', '32', '39', '33']], ['5 × 13 = ?', ['65', '60', '55', '75']], ['7 × 7 = ?', ['49', '42', '56', '47']],
  ] },
  { slug: 'fractions', title: 'Fractions Fun', subject: 'Math', color: '#e44c8d', description: 'Equivalent fractions, simplifying and adding.', q: [
    ['Which fraction equals 1/2?', ['2/4', '2/3', '3/4', '1/3']], ['Simplify 6/8', ['3/4', '2/3', '1/2', '4/6']], ['1/4 + 1/4 = ?', ['1/2', '2/8', '1/8', '2/16']],
    ['Which is bigger?', ['3/4', '2/3', '1/2', '5/8']], ['What is half of 3/4?', ['3/8', '3/2', '1/4', '6/8']], ['2/5 + 1/5 = ?', ['3/5', '3/10', '2/10', '1/5']],
    ['How many quarters are in 2 wholes?', ['8', '4', '6', '2']], ['3/3 is the same as…', ['1', '3', '0', '1/3']], ['Simplify 10/15', ['2/3', '1/3', '5/3', '3/5']], ['1 − 1/3 = ?', ['2/3', '1/3', '0', '3/3']],
  ] },
  { slug: 'shapes', title: 'Geometry & Shapes', subject: 'Math', color: '#0bc2cf', description: 'Sides, angles and shape names.', q: [
    ['How many sides does a hexagon have?', ['6', '5', '8', '7']], ['A triangle\'s angles add up to…', ['180°', '360°', '90°', '270°']],
    ['An angle less than 90° is called…', ['Acute', 'Obtuse', 'Right', 'Straight']], ['How many sides does an octagon have?', ['8', '6', '10', '7']],
    ['A shape with 4 equal sides and 4 right angles is a…', ['Square', 'Rhombus', 'Trapezoid', 'Kite']], ['How many degrees are in a full circle?', ['360', '180', '90', '400']],
    ['What do you call a 3D shape like a ball?', ['Sphere', 'Cube', 'Cone', 'Cylinder']], ['Area of a rectangle 5 by 4?', ['20', '18', '9', '25']],
    ['The distance around a shape is its…', ['Perimeter', 'Area', 'Volume', 'Radius']], ['How many faces does a cube have?', ['6', '4', '8', '12']],
  ] },
  { slug: 'algebra', title: 'Algebra Basics', subject: 'Math', color: '#6c4cff', description: 'Solve for x and simple equations.', q: [
    ['x + 5 = 12. What is x?', ['7', '17', '5', '8']], ['2x = 18. What is x?', ['9', '16', '20', '36']], ['x − 4 = 10. What is x?', ['14', '6', '10', '40']],
    ['3x + 1 = 10. What is x?', ['3', '4', '9', '11']], ['x / 2 = 6. What is x?', ['12', '3', '8', '4']], ['If y = 2x and x = 4, y = ?', ['8', '6', '2', '16']],
    ['5 + 3 × 2 = ?', ['11', '16', '13', '10']], ['(4 + 2) × 3 = ?', ['18', '10', '14', '24']], ['What is 2³?', ['8', '6', '9', '5']], ['Solve: 4x = 2x + 6', ['3', '6', '2', '1']],
  ] },
  { slug: 'mental-math', title: 'Mental Math Mix', subject: 'Math', color: '#ff5d5d', description: 'Adding, subtracting and percentages in your head.', q: [
    ['25 + 37 = ?', ['62', '52', '63', '72']], ['100 − 46 = ?', ['54', '64', '56', '44']], ['10% of 80 = ?', ['8', '10', '18', '0.8']],
    ['50% of 64 = ?', ['32', '30', '34', '16']], ['144 ÷ 12 = ?', ['12', '11', '14', '13']], ['How many minutes are in 3 hours?', ['180', '120', '300', '160']],
    ['Round 487 to the nearest hundred', ['500', '400', '490', '480']], ['What is 1,000 − 1?', ['999', '990', '900', '1,001']], ['Double 75', ['150', '140', '175', '155']], ['Half of 250', ['125', '120', '150', '115']],
  ] },
  { slug: 'solar-system', title: 'The Solar System', subject: 'Science', color: '#3a0ca3', description: 'Planets, moons and stars.', q: [
    ['Which planet is closest to the Sun?', ['Mercury', 'Venus', 'Earth', 'Mars']], ['Which planet is known as the Red Planet?', ['Mars', 'Jupiter', 'Venus', 'Saturn']],
    ['What is the largest planet?', ['Jupiter', 'Saturn', 'Neptune', 'Earth']], ['Which planet has the most famous rings?', ['Saturn', 'Mars', 'Mercury', 'Venus']],
    ['The Sun is a…', ['Star', 'Planet', 'Moon', 'Comet']], ['How many planets are in our solar system?', ['8', '9', '7', '10']],
    ['What is Earth\'s natural satellite?', ['The Moon', 'Mars', 'The Sun', 'Phobos']], ['Which is the hottest planet?', ['Venus', 'Mercury', 'Mars', 'Jupiter']],
    ['Which planet is farthest from the Sun?', ['Neptune', 'Uranus', 'Saturn', 'Jupiter']], ['How long does Earth take to orbit the Sun?', ['About 365 days', 'About 30 days', '24 hours', 'About 100 days']],
  ] },
  { slug: 'human-body', title: 'The Human Body', subject: 'Science', color: '#e63946', description: 'Organs, bones and how your body works.', q: [
    ['Which organ pumps blood around the body?', ['Heart', 'Lungs', 'Liver', 'Brain']], ['How many bones does an adult human have?', ['206', '106', '306', '186']],
    ['Which organ do you use to breathe?', ['Lungs', 'Stomach', 'Kidneys', 'Heart']], ['What is the largest organ of the body?', ['Skin', 'Liver', 'Brain', 'Heart']],
    ['Which blood cells fight infection?', ['White blood cells', 'Red blood cells', 'Platelets', 'Plasma']], ['Where is the femur bone?', ['Thigh', 'Arm', 'Skull', 'Chest']],
    ['Which organ controls your thoughts?', ['Brain', 'Heart', 'Spine', 'Stomach']], ['What do red blood cells carry?', ['Oxygen', 'Food', 'Hormones', 'Water']],
    ['How many chambers does the human heart have?', ['4', '2', '3', '6']], ['Which sense uses the cochlea?', ['Hearing', 'Sight', 'Smell', 'Taste']],
  ] },
  { slug: 'animals', title: 'Animals & Habitats', subject: 'Science', color: '#4bc22e', description: 'Where animals live and what makes them special.', q: [
    ['What is the largest animal on Earth?', ['Blue whale', 'Elephant', 'Giraffe', 'Great white shark']], ['A frog is a…', ['Amphibian', 'Reptile', 'Mammal', 'Fish']],
    ['What do you call an animal that eats only plants?', ['Herbivore', 'Carnivore', 'Omnivore', 'Predator']], ['Which animal is the fastest on land?', ['Cheetah', 'Lion', 'Horse', 'Kangaroo']],
    ['Which bird cannot fly?', ['Penguin', 'Eagle', 'Sparrow', 'Owl']], ['Where do polar bears live?', ['The Arctic', 'Antarctica', 'The desert', 'The rainforest']],
    ['A baby kangaroo is called a…', ['Joey', 'Cub', 'Kit', 'Calf']], ['How many legs does a spider have?', ['8', '6', '10', '4']],
    ['Which animal is known for changing color?', ['Chameleon', 'Snake', 'Turtle', 'Iguana']], ['Camels store fat in their…', ['Humps', 'Tails', 'Legs', 'Necks']],
  ] },
  { slug: 'chemistry', title: 'Elements & Matter', subject: 'Science', color: '#2a9d8f', description: 'States of matter and the periodic table.', q: [
    ['What is the chemical symbol for water?', ['H₂O', 'CO₂', 'O₂', 'NaCl']], ['What is the symbol for gold?', ['Au', 'Ag', 'Go', 'Gd']],
    ['What gas do plants take in?', ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium']], ['Ice melting into water is a change from…', ['Solid to liquid', 'Liquid to gas', 'Gas to liquid', 'Liquid to solid']],
    ['What is the symbol for oxygen?', ['O', 'Ox', 'Og', 'Om']], ['Water boils at what temperature (sea level)?', ['100 °C', '50 °C', '0 °C', '212 °C']],
    ['Which gas makes balloons float?', ['Helium', 'Oxygen', 'Carbon dioxide', 'Nitrogen']], ['What is the smallest unit of an element?', ['Atom', 'Cell', 'Molecule', 'Grain']],
    ['Table salt is made of sodium and…', ['Chlorine', 'Oxygen', 'Carbon', 'Iron']], ['Which state of matter has a fixed shape?', ['Solid', 'Liquid', 'Gas', 'Plasma']],
  ] },
  { slug: 'earth-science', title: 'Weather & Earth', subject: 'Science', color: '#3d8ee8', description: 'Rocks, weather and our planet.', q: [
    ['What is the layer of gas around Earth called?', ['Atmosphere', 'Crust', 'Core', 'Mantle']], ['Rain, snow and hail are kinds of…', ['Precipitation', 'Evaporation', 'Erosion', 'Condensation']],
    ['What tool measures temperature?', ['Thermometer', 'Barometer', 'Ruler', 'Compass']], ['Rock formed from cooled lava is…', ['Igneous', 'Sedimentary', 'Metamorphic', 'Fossil']],
    ['What is the center of the Earth called?', ['Core', 'Crust', 'Mantle', 'Magma']], ['Water turning into vapor is called…', ['Evaporation', 'Condensation', 'Freezing', 'Melting']],
    ['What causes day and night?', ['Earth spinning', 'The Moon', 'Clouds', 'Earth orbiting the Sun']], ['A scientist who studies earthquakes is a…', ['Seismologist', 'Biologist', 'Botanist', 'Astronomer']],
    ['Which is the largest ocean?', ['Pacific', 'Atlantic', 'Indian', 'Arctic']], ['What do we call moving air?', ['Wind', 'Fog', 'Humidity', 'Frost']],
  ] },
  { slug: 'plants', title: 'Plants & Photosynthesis', subject: 'Science', color: '#38b000', description: 'How plants grow and make food.', q: [
    ['Plants make food using sunlight in a process called…', ['Photosynthesis', 'Respiration', 'Digestion', 'Pollination']], ['Which part of a plant takes in water?', ['Roots', 'Leaves', 'Petals', 'Flowers']],
    ['What gives leaves their green color?', ['Chlorophyll', 'Sugar', 'Water', 'Oxygen']], ['What gas do plants give off?', ['Oxygen', 'Carbon dioxide', 'Helium', 'Hydrogen']],
    ['Bees help plants by spreading…', ['Pollen', 'Seeds', 'Water', 'Soil']], ['The part of a plant that grows into a new plant is the…', ['Seed', 'Stem', 'Leaf', 'Thorn']],
    ['Which part holds the plant up?', ['Stem', 'Root hair', 'Petal', 'Pollen']], ['A cactus is adapted to live in the…', ['Desert', 'Ocean', 'Arctic', 'Rainforest']],
    ['Trees that lose their leaves in autumn are…', ['Deciduous', 'Evergreen', 'Coniferous', 'Tropical']], ['What do plants need to grow?', ['Light, water and air', 'Only soil', 'Only water', 'Darkness']],
  ] },
  { slug: 'capitals', title: 'World Capitals', subject: 'Geography', color: '#f4a261', description: 'Match the country to its capital city.', q: [
    ['Capital of France?', ['Paris', 'Lyon', 'Rome', 'Madrid']], ['Capital of Japan?', ['Tokyo', 'Osaka', 'Kyoto', 'Seoul']],
    ['Capital of the United Arab Emirates?', ['Abu Dhabi', 'Dubai', 'Sharjah', 'Doha']], ['Capital of Australia?', ['Canberra', 'Sydney', 'Melbourne', 'Perth']],
    ['Capital of Canada?', ['Ottawa', 'Toronto', 'Vancouver', 'Montreal']], ['Capital of Egypt?', ['Cairo', 'Alexandria', 'Giza', 'Luxor']],
    ['Capital of Italy?', ['Rome', 'Milan', 'Venice', 'Naples']], ['Capital of Brazil?', ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador']],
    ['Capital of the United Kingdom?', ['London', 'Manchester', 'Edinburgh', 'Dublin']], ['Capital of India?', ['New Delhi', 'Mumbai', 'Kolkata', 'Bangalore']],
  ] },
  { slug: 'continents', title: 'Continents & Oceans', subject: 'Geography', color: '#0077b6', description: 'The big picture of planet Earth.', q: [
    ['How many continents are there?', ['7', '5', '6', '8']], ['Which is the largest continent?', ['Asia', 'Africa', 'Europe', 'North America']],
    ['Which continent is the coldest?', ['Antarctica', 'Europe', 'Asia', 'North America']], ['The Sahara Desert is in…', ['Africa', 'Asia', 'Australia', 'South America']],
    ['Which ocean is between Africa and Australia?', ['Indian Ocean', 'Atlantic Ocean', 'Arctic Ocean', 'Southern Ocean']], ['Brazil is on which continent?', ['South America', 'Africa', 'North America', 'Europe']],
    ['What is the longest river in the world (commonly listed)?', ['Nile', 'Amazon', 'Mississippi', 'Yangtze']], ['Mount Everest is in which mountain range?', ['Himalayas', 'Alps', 'Andes', 'Rockies']],
    ['Which continent is also a country?', ['Australia', 'Africa', 'Europe', 'Asia']], ['The equator divides Earth into…', ['North and South', 'East and West', 'Land and sea', 'Day and night']],
  ] },
  { slug: 'flags', title: 'Flags & Countries', subject: 'Geography', color: '#d62828', description: 'Can you name the country from its flag?', q: [
    ['Which country\'s flag has a red maple leaf?', ['Canada', 'Switzerland', 'Japan', 'Austria']], ['Which flag is a red circle on a white background?', ['Japan', 'Bangladesh', 'China', 'Korea']],
    ['The "Union Jack" is the flag of…', ['United Kingdom', 'Australia', 'Ireland', 'France']], ['Which flag has 50 stars?', ['United States', 'Brazil', 'China', 'Chile']],
    ['Which country\'s flag is red with a white cross?', ['Switzerland', 'Denmark', 'Sweden', 'Norway']], ['The UAE flag has red, green, white and…', ['Black', 'Blue', 'Yellow', 'Orange']],
    ['Which flag has a cedar tree on it?', ['Lebanon', 'Canada', 'Cyprus', 'Morocco']], ['Which flag has vertical green, white and orange stripes?', ['Ireland', 'Italy', 'India', 'Mexico']],
    ['Which flag has a blue circle of stars?', ['European Union', 'United States', 'Australia', 'Brazil']], ['Which country\'s flag has a dragon on it?', ['Bhutan', 'China', 'Japan', 'Thailand']],
  ] },
  { slug: 'landmarks', title: 'Famous Landmarks', subject: 'Geography', color: '#9d4edd', description: 'Where in the world is it?', q: [
    ['The Eiffel Tower is in…', ['Paris', 'London', 'Rome', 'Berlin']], ['The Burj Khalifa is in…', ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha']],
    ['The Great Wall is in…', ['China', 'Japan', 'India', 'Mongolia']], ['The Statue of Liberty is in…', ['New York', 'Washington, D.C.', 'Boston', 'Chicago']],
    ['The Taj Mahal is in…', ['India', 'Pakistan', 'Iran', 'Turkey']], ['The pyramids of Giza are in…', ['Egypt', 'Mexico', 'Sudan', 'Jordan']],
    ['The Colosseum is in…', ['Rome', 'Athens', 'Paris', 'Madrid']], ['Machu Picchu is in…', ['Peru', 'Chile', 'Brazil', 'Mexico']],
    ['Big Ben is in…', ['London', 'Paris', 'Dublin', 'Berlin']], ['The Sydney Opera House is in…', ['Australia', 'New Zealand', 'South Africa', 'Canada']],
  ] },
  { slug: 'ancient-egypt', title: 'Ancient Egypt', subject: 'History', color: '#e9c46a', description: 'Pharaohs, pyramids and the Nile.', q: [
    ['Egyptian kings were called…', ['Pharaohs', 'Emperors', 'Sultans', 'Caesars']], ['Which river was vital to ancient Egypt?', ['Nile', 'Amazon', 'Tigris', 'Danube']],
    ['Egyptian picture writing is called…', ['Hieroglyphics', 'Cuneiform', 'Runes', 'Latin']], ['Preserved bodies in Egypt are called…', ['Mummies', 'Statues', 'Fossils', 'Sphinxes']],
    ['Which young pharaoh\'s tomb was found in 1922?', ['Tutankhamun', 'Ramses II', 'Cleopatra', 'Khufu']], ['The Great Sphinx has the body of a…', ['Lion', 'Bull', 'Camel', 'Eagle']],
    ['Ancient Egyptians wrote on paper made from…', ['Papyrus', 'Bamboo', 'Silk', 'Leather']], ['The Great Pyramid was built for pharaoh…', ['Khufu', 'Tutankhamun', 'Akhenaten', 'Ramses II']],
    ['What stone helped decode hieroglyphics?', ['Rosetta Stone', 'Blarney Stone', 'Moonstone', 'Stonehenge']], ['Which famous queen was the last active ruler of ancient Egypt\'s Ptolemaic kingdom?', ['Cleopatra VII', 'Nefertiti', 'Hatshepsut', 'Isis']],
  ] },
  { slug: 'world-history', title: 'World History Basics', subject: 'History', color: '#bc6c25', description: 'Big moments that shaped the world.', q: [
    ['Who was the first person to walk on the Moon?', ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'John Glenn']], ['In what year did World War II end?', ['1945', '1939', '1918', '1950']],
    ['Who painted the Mona Lisa?', ['Leonardo da Vinci', 'Michelangelo', 'Picasso', 'Van Gogh']], ['The Berlin Wall fell in…', ['1989', '1961', '1991', '1975']],
    ['Who was the first President of the United States?', ['George Washington', 'Abraham Lincoln', 'Thomas Jefferson', 'John Adams']], ['Christopher Columbus first crossed the Atlantic in…', ['1492', '1620', '1776', '1066']],
    ['The ship that sank in 1912 after hitting an iceberg?', ['Titanic', 'Mayflower', 'Lusitania', 'Santa Maria']], ['The first person in space was…', ['Yuri Gagarin', 'Neil Armstrong', 'Alan Shepard', 'Valentina Tereshkova']],
    ['Which empire built Machu Picchu?', ['Inca', 'Aztec', 'Maya', 'Roman']], ['The UAE was founded in…', ['1971', '1948', '1990', '1965']],
  ] },
  { slug: 'inventions', title: 'Inventions & Inventors', subject: 'History', color: '#ffb703', description: 'Who made what?', q: [
    ['Who is credited with inventing the telephone?', ['Alexander Graham Bell', 'Thomas Edison', 'Nikola Tesla', 'Isaac Newton']], ['The Wright brothers built the first successful…', ['Airplane', 'Car', 'Train', 'Rocket']],
    ['Who made a long-lasting practical light bulb in 1879?', ['Thomas Edison', 'Benjamin Franklin', 'Albert Einstein', 'Galileo']], ['The printing press was developed by…', ['Johannes Gutenberg', 'Leonardo da Vinci', 'Marie Curie', 'James Watt']],
    ['Penicillin was discovered by…', ['Alexander Fleming', 'Louis Pasteur', 'Charles Darwin', 'Edward Jenner']], ['Who developed the theory of relativity?', ['Albert Einstein', 'Isaac Newton', 'Stephen Hawking', 'Nikola Tesla']],
    ['Who invented the World Wide Web?', ['Tim Berners-Lee', 'Bill Gates', 'Steve Jobs', 'Mark Zuckerberg']], ['Marie Curie is famous for research on…', ['Radioactivity', 'Electricity', 'Gravity', 'Vaccines']],
    ['Who described gravity and the laws of motion?', ['Isaac Newton', 'Galileo Galilei', 'Aristotle', 'Copernicus']], ['Which was invented first?', ['Wheel', 'Television', 'Telephone', 'Computer']],
  ] },
  { slug: 'greece-rome', title: 'Ancient Greece & Rome', subject: 'History', color: '#457b9d', description: 'Gods, empires and the Olympics.', q: [
    ['The Olympic Games started in ancient…', ['Greece', 'Rome', 'Egypt', 'China']], ['The king of the Greek gods was…', ['Zeus', 'Poseidon', 'Hades', 'Apollo']],
    ['Roman gladiators fought in the…', ['Colosseum', 'Parthenon', 'Pantheon', 'Acropolis']], ['The Roman god of war was…', ['Mars', 'Jupiter', 'Neptune', 'Mercury']],
    ['Which city was destroyed by Mount Vesuvius in 79 AD?', ['Pompeii', 'Athens', 'Sparta', 'Carthage']], ['The Parthenon is in…', ['Athens', 'Rome', 'Sparta', 'Troy']],
    ['Julius Caesar was a leader of…', ['Rome', 'Greece', 'Persia', 'Egypt']], ['The Greek god of the sea was…', ['Poseidon', 'Ares', 'Hermes', 'Zeus']],
    ['Which language did ancient Romans speak?', ['Latin', 'Greek', 'Italian', 'French']], ['Democracy was first developed in ancient…', ['Athens', 'Rome', 'Babylon', 'Egypt']],
  ] },
  { slug: 'parts-of-speech', title: 'Parts of Speech', subject: 'English', color: '#ef476f', description: 'Nouns, verbs, adjectives and more.', q: [
    ['A word that names a person, place or thing is a…', ['Noun', 'Verb', 'Adjective', 'Adverb']], ['A word that shows action is a…', ['Verb', 'Noun', 'Pronoun', 'Preposition']],
    ['In "the tall tree", "tall" is an…', ['Adjective', 'Adverb', 'Noun', 'Verb']], ['In "she ran quickly", "quickly" is an…', ['Adverb', 'Adjective', 'Verb', 'Noun']],
    ['Which word is a pronoun?', ['They', 'Run', 'Happy', 'Under']], ['Which word is a preposition?', ['Under', 'Jump', 'Blue', 'Slowly']],
    ['"And", "but" and "or" are…', ['Conjunctions', 'Nouns', 'Adverbs', 'Pronouns']], ['Which is a proper noun?', ['London', 'city', 'river', 'teacher']],
    ['The past tense of "go" is…', ['Went', 'Goed', 'Gone', 'Going']], ['"Wow!" is an example of an…', ['Interjection', 'Adjective', 'Article', 'Adverb']],
  ] },
  { slug: 'synonyms', title: 'Synonyms & Antonyms', subject: 'English', color: '#06d6a0', description: 'Same meaning or opposite?', q: [
    ['A synonym for "happy"', ['Joyful', 'Sad', 'Angry', 'Tired']], ['An antonym for "hot"', ['Cold', 'Warm', 'Boiling', 'Spicy']],
    ['A synonym for "big"', ['Large', 'Tiny', 'Short', 'Thin']], ['An antonym for "begin"', ['End', 'Start', 'Open', 'Launch']],
    ['A synonym for "quick"', ['Fast', 'Slow', 'Lazy', 'Late']], ['An antonym for "ancient"', ['Modern', 'Old', 'Historic', 'Aged']],
    ['A synonym for "brave"', ['Courageous', 'Scared', 'Shy', 'Weak']], ['An antonym for "generous"', ['Selfish', 'Kind', 'Giving', 'Helpful']],
    ['A synonym for "difficult"', ['Hard', 'Easy', 'Simple', 'Soft']], ['An antonym for "victory"', ['Defeat', 'Win', 'Triumph', 'Success']],
  ] },
  { slug: 'spelling', title: 'Spelling Bee', subject: 'English', color: '#ffd166', description: 'Pick the correct spelling.', q: [
    ['Which is spelled correctly?', ['Because', 'Becuase', 'Becouse', 'Beacause']], ['Which is spelled correctly?', ['Separate', 'Seperate', 'Separete', 'Seperete']],
    ['Which is spelled correctly?', ['Necessary', 'Neccessary', 'Necesary', 'Neccesary']], ['Which is spelled correctly?', ['Friend', 'Freind', 'Frend', 'Friennd']],
    ['Which is spelled correctly?', ['Definitely', 'Definately', 'Defenitely', 'Definitly']], ['Which is spelled correctly?', ['Beautiful', 'Beutiful', 'Beautifull', 'Beatiful']],
    ['Which is spelled correctly?', ['Tomorrow', 'Tommorow', 'Tomorow', 'Tommorrow']], ['Which is spelled correctly?', ['Library', 'Libary', 'Liberry', 'Librery']],
    ['Which is spelled correctly?', ['Calendar', 'Calender', 'Calandar', 'Callendar']], ['Which is spelled correctly?', ['Rhythm', 'Rythm', 'Rhythym', 'Rhytm']],
  ] },
  { slug: 'figurative', title: 'Figurative Language', subject: 'English', color: '#8338ec', description: 'Similes, metaphors and more.', q: [
    ['"As brave as a lion" is a…', ['Simile', 'Metaphor', 'Onomatopoeia', 'Alliteration']], ['"Time is money" is a…', ['Metaphor', 'Simile', 'Hyperbole', 'Rhyme']],
    ['"Buzz", "bang" and "sizzle" are examples of…', ['Onomatopoeia', 'Personification', 'Simile', 'Idiom']], ['"Sally sells seashells" uses…', ['Alliteration', 'Hyperbole', 'Metaphor', 'Simile']],
    ['"I\'ve told you a million times!" is…', ['Hyperbole', 'Simile', 'Onomatopoeia', 'Alliteration']], ['"The wind whispered through the trees" is…', ['Personification', 'Simile', 'Hyperbole', 'Alliteration']],
    ['"It\'s raining cats and dogs" is an…', ['Idiom', 'Simile', 'Onomatopoeia', 'Alliteration']], ['A simile compares using…', ['"Like" or "as"', '"And" or "but"', 'Numbers', 'Rhymes']],
    ['"Her smile was sunshine" is a…', ['Metaphor', 'Simile', 'Idiom', 'Pun']], ['Words that end with the same sound…', ['Rhyme', 'Alliterate', 'Contrast', 'Repeat']],
  ] },
  { slug: 'spanish', title: 'Spanish Basics', subject: 'Languages', color: '#f77f00', description: 'Greetings, numbers and colors in Spanish.', q: [
    ['"Hola" means…', ['Hello', 'Goodbye', 'Please', 'Thanks']], ['"Gracias" means…', ['Thank you', 'Sorry', 'Yes', 'Good night']],
    ['How do you say "red" in Spanish?', ['Rojo', 'Azul', 'Verde', 'Negro']], ['"Uno, dos, tres" means…', ['One, two, three', 'Red, blue, green', 'Hi, bye, yes', 'Cat, dog, bird']],
    ['"Perro" means…', ['Dog', 'Cat', 'Horse', 'Bird']], ['"Adiós" means…', ['Goodbye', 'Hello', 'Welcome', 'Please']],
    ['How do you say "water"?', ['Agua', 'Leche', 'Pan', 'Fuego']], ['"Buenos días" means…', ['Good morning', 'Good night', 'Good luck', 'Goodbye']],
    ['"Escuela" means…', ['School', 'House', 'Street', 'Store']], ['How do you say "please"?', ['Por favor', 'De nada', 'Lo siento', 'Hasta luego']],
  ] },
  { slug: 'french', title: 'French Basics', subject: 'Languages', color: '#0055a4', description: 'Everyday French words.', q: [
    ['"Bonjour" means…', ['Hello', 'Goodbye', 'Thank you', 'Please']], ['"Merci" means…', ['Thank you', 'Sorry', 'Yes', 'No']],
    ['How do you say "cat" in French?', ['Chat', 'Chien', 'Cheval', 'Poisson']], ['"Au revoir" means…', ['Goodbye', 'Hello', 'Welcome', 'Good luck']],
    ['"Oui" means…', ['Yes', 'No', 'Maybe', 'Why']], ['How do you say "bread"?', ['Pain', 'Lait', 'Eau', 'Fromage']],
    ['"Rouge" is the color…', ['Red', 'Blue', 'Green', 'Yellow']], ['"Un, deux, trois" means…', ['One, two, three', 'Hi, bye, yes', 'Red, white, blue', 'Big, small, tall']],
    ['"Bonne nuit" means…', ['Good night', 'Good morning', 'Good job', 'Good day']], ['How do you say "school"?', ['École', 'Maison', 'Livre', 'Ville']],
  ] },
  { slug: 'arabic', title: 'Arabic Basics', subject: 'Languages', color: '#007a3d', description: 'Common Arabic words (written in English letters).', q: [
    ['"Marhaba" means…', ['Hello', 'Goodbye', 'Thank you', 'Sorry']], ['"Shukran" means…', ['Thank you', 'Please', 'Yes', 'Good night']],
    ['"Na\'am" means…', ['Yes', 'No', 'Maybe', 'Hello']], ['"La" means…', ['No', 'Yes', 'Hello', 'Please']],
    ['"Kitab" means…', ['Book', 'Pen', 'Door', 'Table']], ['"Madrasa" means…', ['School', 'House', 'Market', 'Mosque']],
    ['"Bayt" means…', ['House', 'Car', 'Tree', 'Sun']], ['"Ma\'a salama" means…', ['Goodbye', 'Good morning', 'Welcome', 'Thank you']],
    ['"Sabah al-khair" means…', ['Good morning', 'Good night', 'Good luck', 'Happy birthday']], ['"Wahid" is the number…', ['1', '2', '5', '10']],
  ] },
  { slug: 'coding', title: 'Computers & Coding', subject: 'Technology', color: '#2b2d42', description: 'Tech words every student should know.', q: [
    ['What does "CPU" stand for?', ['Central Processing Unit', 'Computer Power Unit', 'Central Program Utility', 'Core Processing User']], ['Which of these is a programming language?', ['Python', 'Photoshop', 'Chrome', 'Excel']],
    ['A mistake in code is called a…', ['Bug', 'Glitch-bot', 'Crash pad', 'Patch']], ['What does "www" stand for?', ['World Wide Web', 'Wide World Window', 'Web World Wide', 'World Web Wire']],
    ['Binary code uses which digits?', ['0 and 1', '1 and 2', '0 to 9', 'A to Z']], ['A set of step-by-step instructions is an…', ['Algorithm', 'Antivirus', 'App store', 'Avatar']],
    ['Which device is used to type?', ['Keyboard', 'Monitor', 'Speaker', 'Printer']], ['What is a strong password?', ['A long mix of letters, numbers and symbols', 'Your name', '123456', 'password']],
    ['RAM is a kind of…', ['Memory', 'Screen', 'Cable', 'Battery']], ['A loop in code…', ['Repeats instructions', 'Deletes files', 'Turns off the PC', 'Prints paper']],
  ] },
  { slug: 'music-art', title: 'Music & Art', subject: 'Arts', color: '#f15bb5', description: 'Colors, instruments and famous artists.', q: [
    ['Mixing blue and yellow makes…', ['Green', 'Purple', 'Orange', 'Brown']], ['Mixing red and blue makes…', ['Purple', 'Green', 'Orange', 'Pink']],
    ['Which instrument has 88 keys?', ['Piano', 'Guitar', 'Violin', 'Flute']], ['The primary colors (painting) are red, yellow and…', ['Blue', 'Green', 'Orange', 'Purple']],
    ['Who painted "The Starry Night"?', ['Vincent van Gogh', 'Pablo Picasso', 'Claude Monet', 'Frida Kahlo']], ['How many strings does a standard guitar have?', ['6', '4', '5', '8']],
    ['Which instrument family does the trumpet belong to?', ['Brass', 'Woodwind', 'String', 'Percussion']], ['A drum is a…', ['Percussion instrument', 'String instrument', 'Brass instrument', 'Woodwind']],
    ['Which composer wrote "Für Elise"?', ['Beethoven', 'Mozart', 'Bach', 'Chopin']], ['How many lines are on a music staff?', ['5', '4', '6', '7']],
  ] },
  { slug: 'health', title: 'Health & Nutrition', subject: 'Health', color: '#80b918', description: 'Healthy habits and food groups.', q: [
    ['Which food group gives you lots of protein?', ['Meat, beans & eggs', 'Sweets', 'Oils', 'Soda']], ['How often should you brush your teeth?', ['Twice a day', 'Once a week', 'Never', 'Once a month']],
    ['Which vitamin do we get from sunlight?', ['Vitamin D', 'Vitamin C', 'Vitamin A', 'Vitamin K']], ['Oranges are well known for vitamin…', ['C', 'D', 'B12', 'K']],
    ['What is the best drink for staying hydrated?', ['Water', 'Soda', 'Energy drinks', 'Coffee']], ['Milk and cheese are good sources of…', ['Calcium', 'Iron', 'Sugar', 'Caffeine']],
    ['How long should you wash your hands?', ['About 20 seconds', '2 seconds', '5 minutes', 'No need']], ['Exercise makes your heart…', ['Stronger', 'Weaker', 'Smaller', 'Stop']],
    ['Kids should get roughly how much sleep a night?', ['9–12 hours', '3–4 hours', '5 hours', '15+ hours']], ['Which of these is a whole grain?', ['Brown rice', 'Candy', 'Butter', 'Chips']],
  ] },
  { slug: 'fun-trivia', title: 'Fun Trivia', subject: 'Trivia', color: '#ff70a6', description: 'A random mix of fun facts.', q: [
    ['How many days are in a leap year?', ['366', '365', '364', '360']], ['What color do you get by mixing red and white?', ['Pink', 'Purple', 'Orange', 'Brown']],
    ['How many legs does an insect have?', ['6', '8', '4', '10']], ['How many hours are in a day?', ['24', '12', '48', '20']],
    ['What do bees make?', ['Honey', 'Milk', 'Silk', 'Wax only']], ['Which is the smallest prime number?', ['2', '1', '3', '0']],
    ['How many sides does a stop sign have?', ['8', '6', '5', '4']], ['Which month has the fewest days?', ['February', 'April', 'June', 'November']],
    ['What is frozen water called?', ['Ice', 'Steam', 'Fog', 'Dew']], ['How many colors are in a rainbow?', ['7', '5', '6', '9']],
  ] },
  { slug: 'sports', title: 'Sports & Games', subject: 'Trivia', color: '#2a9d8f', description: 'Balls, rules and records.', q: [
    ['How many players does a soccer team have on the field?', ['11', '9', '10', '12']], ['In which sport do you score a "touchdown"?', ['American football', 'Basketball', 'Tennis', 'Cricket']],
    ['How often are the Summer Olympics held?', ['Every 4 years', 'Every year', 'Every 2 years', 'Every 10 years']], ['A basketball hoop is how high (regulation)?', ['10 feet', '8 feet', '12 feet', '6 feet']],
    ['In tennis, a score of zero is called…', ['Love', 'Nil', 'Duck', 'Blank']], ['Which sport uses a shuttlecock?', ['Badminton', 'Tennis', 'Squash', 'Volleyball']],
    ['How many rings are on the Olympic flag?', ['5', '4', '6', '7']], ['Cricket matches are often played with how many players per team?', ['11', '9', '7', '15']],
    ['Which sport is played at Wimbledon?', ['Tennis', 'Golf', 'Rugby', 'Cricket']], ['In chess, which piece can only move diagonally?', ['Bishop', 'Rook', 'Knight', 'King']],
  ] },
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seededShuffle(arr, seed) {
  // mulberry32 PRNG: deterministic, well mixed
  let t = seed >>> 0;
  const rand = () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function officialSets() {
  return SETS.map((s, n) => ({
    id: `official-${s.slug}`, ownerId: OFFICIAL_ID, title: s.title, description: s.description, subject: s.subject, color: s.color,
    public: true, plays: 0, created: Date.UTC(2026, 10, 25) - n * 1000, updated: Date.UTC(2026, 10, 25) - n * 1000,
    questions: s.q.map(([q, answers]) => {
      const shuffled = seededShuffle(answers, hash(q + answers.join('|')));
      return { q, answers: shuffled, correct: [shuffled.indexOf(answers[0])], time: 20 };
    }),
  }));
}

export function seedOfficialSets(store) {
  const meta = store.get('meta', 'seed') || { version: 0 };
  if (meta.version >= SEED_VERSION) return;
  let added = 0;
  for (const s of officialSets()) if (!store.get('sets', s.id)) { store.put('sets', s.id, s); added++; }
  store.put('meta', 'seed', { version: SEED_VERSION, at: Date.now() });
  console.log(`[seed] added ${added} official sets`);
}
