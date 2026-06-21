import pastqCover from "@/assets/pastq-ebsu-cover.jpg";

export type BuiltInPastQuestion = {
  id: string;
  title: string;
  body: string;
  course: { code: string; title: string };
  faculty?: string | null;
  department?: string | null;
  page: number;
};

export const pastQuestionCover = pastqCover;

export const builtInPastQuestions = [
  {
    "id": "pdf-page-01",
    "title": "PIO 201 — General Physiology/Blood",
    "course": {
      "code": "PIO 201",
      "title": "General Physiology/Blood"
    },
    "faculty": "Faculty of Basic Medical Sciences",
    "department": "Department of Physiology, Anatomy, Nursing Sc. and Med. Lab. Sc.",
    "page": 1,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF BASIC MEDICAL SCIENCES\nDEPARTMENT OF PHYSIOLOGY, ANATOMY, NURSING SC. AND MED. LAB. SC.\n1ST SEMESTER EXAMINATION 2025/2026\nCourse Title: General Physiology/Blood — Course Code: PIO 201\nInstructions: Answer Five (5) questions only\nTIME: 2½ HOURS\nDATE: 16th March, 2026\n\n1. Define/Describe Osmotic pressure and the processes that often lead to that phenomenon.\n2. Describe the cell cycle and state its biologic importance.\n3. Write all you know about Two (2) of the following:\n   (a) Diffusion (b) Osmosis (c) Phagocytosis\n4. Write an essay on erythropoiesis.\n5. Write short notes on any two:\n   (a) Nature of antigen (b) Functions of blood (c) Platelets (d) Blood compatibility\n6. Discuss Haematopoiesis."
  },
  {
    "id": "pdf-page-02",
    "title": "PHY 261 — Modern Astrophysics",
    "course": {
      "code": "PHY 261",
      "title": "Modern Astrophysics"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Physics",
    "page": 2,
    "body": "EBONYI STATE UNIVERSITY\nFACULTY OF SCIENCE\nDEPARTMENT OF INDUSTRIAL PHYSICS\n2024/2025 FIRST SEMESTER EXAMINATION\nPHY 261: Modern Astrophysics\nTIME ALLOWED: 2 HOURS — EXAM DATE: 29/04/2025\nAttempt any FOUR questions. Each question has the same weight.\n\nQuestion One:\n(a) What is the connection between Greek tradition and modern astrophysics?\n(b) What is a geocentric universe? Who proposed it? When?\n(c) What is Retrograde Motion? Mention two astronomers connected with it.\n\nQuestion Two:\n(a) Mention three contributions of Hipparchus to astronomy.\n(b) What is the Copernican Revolution?\n(c) What is \"De Revolutionibus Orbium Coelestium\"?\n\nQuestion Three:\n(a) Why was it published after the death of the author?\n(b) Who observed the supernova of 1572? How did such an observation contradict church doctrine?\n(c) State Kepler's first and second laws.\n\nQuestion Four:\n(a) State Kepler's third law of planets orbiting the Sun.\n(b) What is the difference between perihelion and aphelion?\n(c) Who is the father of modern astronomy? Explain his ordeal with the church.\n\nQuestion Five:\n(a) \"By the claw, the lion is revealed.\" Who made this comment? Why?\n(b) Three elements make up nearly 100% of the composition of the Sun. List the elements and their percentage compositions.\n(c) Sketch a diagram of the Sun's interior.\n\nQuestion Six:\n(a) Sketch the thicknesses of the components of the Sun's atmosphere.\n(b) Discuss the components of the Sun's atmosphere.\n(c) What is the difference between aurora borealis and aurora australis?"
  },
  {
    "id": "pdf-page-03",
    "title": "EDU 101 — Introduction to Teaching and Educational Foundation",
    "course": {
      "code": "EDU 101",
      "title": "Introduction to Teaching and Educational Foundation"
    },
    "faculty": "Faculty of Education",
    "department": "Department of Educational Foundations",
    "page": 3,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF EDUCATION\nDEPARTMENT OF EDUCATIONAL FOUNDATIONS\nFIRST SEMESTER 2025/2026 SESSION\nEDU 101: INTRODUCTION TO TEACHING AND EDUCATIONAL FOUNDATION\nDATE: 16th MARCH, 2026 — TIME ALLOWED: 2 HRS\n\nInstruction: Answer only one question in each section.\n\nSECTION A\n1(a) \"Teaching is NOT a profession in Nigeria.\" Discuss.\n(b) Who is a professional teacher and an auxiliary teacher?\n2(a) Stinnett suggested the following characters for appraising a profession's social work. Enumerate.\n(b) Distinguish between micro teaching and teaching practice.\n\nSECTION B\n3(a) Discuss the three basic assumptions of Jean Piaget's theory of learning.\n(b) What is organisation in learning? Give two examples.\n4(a) What is learning?\n(b) Explain the experiment of Ivan Pavlov on how organisms learn.\n\nSECTION C\n5(a) What is supervision?\n(b) Briefly explain five relevances of supervision in the Nigerian educational system.\n6(a) Write short notes on the following: (i) Training (ii) Recruitment (iii) Promotion (iv) TRCN (v) Retirement."
  },
  {
    "id": "pdf-page-04",
    "title": "COS 201 — Computer Programming I",
    "course": {
      "code": "COS 201",
      "title": "Computer Programming I"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Computer Science",
    "page": 4,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFIRST SEMESTER EXAMINATION 2022/2023 SESSION\nCOURSE CODE: COS 201\nCOURSE TITLE: COMPUTER PROGRAMMING I\nDATE: 23 - 05 - 2024 — TIME: 2 HOURS\nINSTRUCTION: Answer any FOUR questions. All questions carry equal marks.\n\n1(a) What kind of environment is shown above (Visual Basic IDE)?\n(b) Briefly describe the parts of the environment labelled a–h.\n\n2(a) Using a table, list any 8 (eight) controls and their purposes.\n(b) Design and implement a splash screen with a progress bar.\n\n3. Design and implement a Computer Science Department Login system in Visual Basic 6.0, assuming database name: csedbase and table: csclogin.\n\n4(a) Design and implement a calendar and time display system using Visual Basic 6.0.\n(b) Write a Visual Basic program to convert Fahrenheit to Kelvin using the formula:\n$$K = (F - 32) \\times \\tfrac{5}{9} + 273.15$$\n\n5. Design and implement a program that accepts Principal amount, Time and Rate and calculates Simple Interest and Compound Interest. Display the result using a Visual Basic 6.0 message box.\nGiven: $$S.I. = \\frac{P \\times R \\times T}{100}$$ and $$C.I. = P\\,(1 + R)^{T} - P$$\n\n6(a) Design and implement a system that accepts temperature in Celsius and converts it to Fahrenheit using the formula:\n$$F = C \\times \\tfrac{9}{5} + 32$$\n(b) Design a simple program to accept length in centimetres and convert it to metres."
  },
  {
    "id": "pdf-page-05",
    "title": "AMS 101 — Principles of Management",
    "course": {
      "code": "AMS 101",
      "title": "Principles of Management"
    },
    "faculty": "Faculty of Management Sciences",
    "department": "Department of Business Administration & Entrepreneurship",
    "page": 5,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF MANAGEMENT SCIENCES\nDEPARTMENT OF BUSINESS ADMINISTRATION & ENTREPRENEURSHIP\nFIRST SEMESTER EXAM 2025/2026 ACADEMIC SESSION\n\nCOURSE CODE: AMS 101\nCOURSE TITLE: PRINCIPLES OF MANAGEMENT\nTIME ALLOWED: 2 HRS — DATE OF EXAM: 17/3/2025\n\nINSTRUCTION: Answer FOUR (4) questions ONLY. Do not copy questions into your script.\n\n1. (a) Define Principles of Management. (5 mks)\n   (b) Briefly explain the principles of management as propounded by Henri Fayol. (12.5 mks)\n2. (a) What do you understand by organisational structure? (5 mks)\n   (b) Clearly state the elements of organisational structure known to you. (12.5 mks)\n3. (a) Define leadership as clearly as possible. (5 mks)\n   (b) State the basic ingredients of leadership you know. (12.5 mks)\n4. (a) Explain the term departmentalisation. (5 mks)\n   (b) Itemise and discuss the four basic ways an organisation can be departmentalised. (12.5 mks)\n5. (a) What do you understand by management development? (5 mks)\n   (b) State the problems associated with management development in Nigeria. (12.5 mks)\n6. (a) What are the common features in the definitions of management? (5 mks)\n   (b) Outline the basic scientific methods that qualify management as a science. (12.5 mks)"
  },
  {
    "id": "pdf-page-06",
    "title": "PHY 221 — Introduction to Geophysics",
    "course": {
      "code": "PHY 221",
      "title": "Introduction to Geophysics"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Physics",
    "page": 6,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF SCIENCE — INDUSTRIAL PHYSICS DEPARTMENT\nFIRST SEMESTER EXAMINATION 2024/2025 — 5th MAY, 2025 — TIME: 90 mins\nE-PHY 221 INTRODUCTION TO GEOPHYSICS (2 Credits)\nINSTRUCTION: Answer FOUR questions only.\n\n(1a) List three differences between seismic compressional and shear waves.\n(b) List three differences between seismic body waves and seismic surface waves.\n(c) Calculate the speed of a seismic shear wave travelling through a rock of shear modulus $2.2 \\times 10^{8}\\,\\text{N/m}^{2}$ and density $2.6 \\times 10^{3}\\,\\text{kg/m}^{3}$.\n\n(2a) Write an expression to show the relationship between bulk modulus and Young's modulus of a rock and give the meaning of the symbols used.\n(b) If the Young's modulus of a rock is $3.2 \\times 10^{8}\\,\\text{N/m}^{2}$ and the Poisson's ratio is $0.2$, calculate the shear modulus.\n(c) Calculate the velocity of a seismic compressional wave travelling in three dimensions in a medium of density $2600\\,\\text{kg/m}^{3}$ if the shear modulus and bulk modulus are $3.2 \\times 10^{8}\\,\\text{N/m}^{2}$ and $4.7 \\times 10^{9}\\,\\text{N/m}^{2}$ respectively.\n\n(3a) Explain the term \"International Reference Ellipsoid\".\n(b) What do you understand by the geoid?\n(c) Illustrate how the Earth's shape is related to gravity.\n\n(4) What is geophysics, and how does it contribute to our understanding of the Earth's internal and external structure?\n\n(5) What are the main electrical properties of rocks and minerals, and how do they vary with factors like porosity, fluid content and mineral composition?\n\n(6a) What are the main types of electrical conduction mechanisms in rocks and minerals and how do they differ?\n(6b) How does electronic conduction occur in rocks and minerals that exhibit this type of conduction?"
  },
  {
    "id": "pdf-page-07",
    "title": "PHY 231 — Introduction to Nuclear and Radiation Physics",
    "course": {
      "code": "PHY 231",
      "title": "Introduction to Nuclear and Radiation Physics"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Physics",
    "page": 7,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF SCIENCE — INDUSTRIAL PHYSICS DEPARTMENT\nFIRST SEMESTER EXAMINATION 2024/2025 — 28th April, 2025 — TIME: 2 Hrs\nPHY 231: Introduction to Nuclear and Radiation Physics (2 Credits)\nINSTRUCTION: Answer FOUR questions only.\n\n1. (a) Briefly explain X-ray radiation interaction, and give two primary effects of radiation interaction.\n(b) Why is the ionisation power of neutron radiation interaction indirect?\n(c) State two applications of radiation interaction.\n\n2. (a) What are fission fragments, and state three properties of nuclei.\n(b) Differentiate between nuclear fusion and nuclear fission.\n(c) State two conditions for fusion to occur and two applications of nuclear fission.\n\n3. (a) List two types of radionuclides and explain with two examples each.\n(b) What is half-life? Why does radioactivity occur?\n(c) Classify alpha, beta and gamma radiation based on their penetration power, materials used to stop the radiation, ionisation power and examples.\n\n4. (a) What are Nuclear Models?\n(b) Outline the key nuclear models and explain any one of them.\n(c) What are the applications of nuclear models?\n\n5. (a) Briefly explain nuclear fission.\n(b) Outline the types of nuclear fission and give one example of each.\n(c) Calculate the energy released in the fission of $1\\,\\text{kg}$ of $^{235}\\text{U}$. Given that each fission releases $200\\,\\text{MeV}$ of energy, $1\\,\\text{MeV} = 1.6 \\times 10^{-13}\\,\\text{J}$, Avogadro's number $N_A = 6.022 \\times 10^{23}$, and the molar mass of $^{235}\\text{U}$ is $235\\,\\text{g/mol}$. Comment on the result.\n\n6. (a) Explain the function of heavy water in a CANDU reactor and describe its advantages compared to other types of reactors.\n(b) Compare and contrast Pressurised Water Reactors (PWRs) and Boiling Water Reactors (BWRs) in terms of design, operation, efficiency and safety.\n(c) A helium nucleus (alpha particle) has a mass of $4.0026\\,\\text{u}$, while the total mass of its individual protons and neutrons is $4.0319\\,\\text{u}$. Calculate:\n  (i) the mass defect, (ii) the energy released (binding energy) during the formation of the helium nucleus.\n  (Given $1\\,\\text{u} = 931.5\\,\\text{MeV}/c^{2}$.)"
  },
  {
    "id": "pdf-page-08",
    "title": "PHY 205 — Thermal Physics",
    "course": {
      "code": "PHY 205",
      "title": "Thermal Physics"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Physics",
    "page": 8,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF SCIENCE — INDUSTRIAL PHYSICS DEPARTMENT\nFIRST SEMESTER EXAMINATION 2024/2025 — 23rd April, 2025 — TIME: 90 mins\nPHY 205 Thermal Physics (2 Credits)\nINSTRUCTION: Answer FOUR questions only.\n\n(1a) What is the key concept in thermodynamics?\n(b) What led to the historical development of thermodynamics?\n(c) What do you understand by classical thermodynamics?\n\n(2a) State the first law of thermodynamics and derive an equation for the law.\n(b) What is the importance of the zeroth law of thermodynamics?\n(c) Show that the efficiency of any engine cannot be 100%.\n\n(3a) Explain Maxwell relations.\n(b) Using the fundamental equation of thermodynamics, derive Maxwell's first relation.\n\n(4a) Using the Maxwell–Boltzmann distribution function, deduce the fractional distribution of Argon gas molecules compressed in a 40-litre cylinder, with molecules at a speed of $310\\,\\text{m/s}$ and temperature $610\\,\\text{K}$.\n(b) If the system in (4a) has $0.46$ moles of Argon gas, how many molecules have a speed of $321\\,\\text{m/s}$?\n\n(5a) Find the most probable and average speed of Helium gas (atomic mass $4.002\\,\\text{u}$, $N_A = 6.022 \\times 10^{23}\\,\\text{particles/mol}$).\n(b) Define the limit $T(\\text{K}) \\rightarrow 0\\,\\text{K}; \\; S \\rightarrow 0$ in the third law statement.\n\n(6a) Show that $$S = C_v \\ln\\!\\left(\\frac{T_B}{T_A}\\right) + R \\ln\\!\\left(\\frac{V_B}{V_A}\\right)$$\n(b) What is the sum over the microstates of particles having a total number of 9 particles in their 4th and 3rd energy levels?\n(c) Define entropy of a thermodynamic system."
  },
  {
    "id": "pdf-page-09",
    "title": "PHY 291/207 — Practical Physics I",
    "course": {
      "code": "PHY 291/207",
      "title": "Practical Physics I"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Physics",
    "page": 9,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF SCIENCE — DEPARTMENT OF INDUSTRIAL PHYSICS\nCOURSE CODE: PHY 291/207 (PRACTICAL PHYSICS I)\n\n1. What is needed in a conductor to create current?\n(b) Describe the connection of three resistors in parallel to a battery. If each has $5\\,\\Omega$, what is the effective resistance?\n(c) What is the difference between a direct current power supply and an alternating current power supply?\n\n2(a) Mention three apparatus for measuring current.\n(b) Mention 7 electrical components with their symbols.\n(c) A circuit consists of three resistors $R_1 = 1\\tfrac{1}{2}\\,\\Omega$, $R_2 = 3\\,\\Omega$, and $R_3 = \\tfrac{5}{2}\\,\\Omega$ connected in series. The series arrangement is connected in parallel with two other resistors $R_4 = 2\\,\\Omega$ and $R_5 = \\tfrac{1}{2}\\,\\Omega$. Determine the total resistance of the circuit.\n\n3(a) By which means can a galvanometer be converted to an ammeter or voltmeter?\n(b) Those materials whose electrons cannot leave their place are known as ____.\n(c) A resistor has a colour code of Red, Violet, Black and Brown. Determine its resistance value in ohms and express it in scientific notation.\n\n4. In first-to-third digit order, tabulate the following colours with their values and tolerance:\n  (a) Blue, Grey, Orange, Gold (b) Brown, Black, Black, Gold (c) Red, Black, Red, Gold (d) Brown, Black, Orange, Gold.\n\n5(a) Four resistors each of $40\\,\\Omega$ are connected in series. Calculate the total resistance.\n(b) Identify the symbols in a diagram showing a battery, an ammeter, and a coil connected in series.\n\n6(a) What is the significance of the fourth band in any resistor?\n(b) What are the uses of a multimeter in the laboratory?\n(c) What is the resistance box used for?"
  },
  {
    "id": "pdf-page-10",
    "title": "PHY 211/PHY 293 — Workshop Process I: Mechanical",
    "course": {
      "code": "PHY 211/PHY 293",
      "title": "Workshop Process I: Mechanical"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Physics",
    "page": 10,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF SCIENCE — INDUSTRIAL PHYSICS DEPARTMENT\nFIRST SEMESTER EXAMINATION 2024/2025 SESSION — DATE: 28/04/25\nPHY 211/PHY 293 (WORKSHOP PROCESS I: MECHANICAL) — TIME: 2 HRS\nANSWER FOUR QUESTIONS.\n\n1. (i) Construct a triangle of side 120 mm and inscribe three circles to touch two sides and two other circles.\n\n2. (i) Circumscribe a circle on a triangle of sides 60 mm each.\n   (ii) Inscribe four equal circles in a square of side 100 mm each to touch one side and two other circles.\n\n3. (i) Construct four equal circles about a given circle of radius 2 mm, each to touch two circles and also the given circle.\n   (ii) Construct triangle ABC of sides 5.3 cm by 3.6 cm by 4.5 cm. Produce sides AB and AC and escribe a circle to the triangle, and measure the diameter of the circle.\n\n4. (i) Construct angles $105^{\\circ}$, $135^{\\circ}$ and $235^{\\circ}$.\n   (ii) Inscribe three equal circles to touch one side and two other circles in an equilateral triangle of side 120 mm.\n\n5. (i) Construct a regular polygon up to a decagon using a base of 40 mm.\n   (ii) Construct an ellipse using the rectangular method measuring 120 mm by 80 mm.\n\n6. (i) Inscribe three equal circles each to touch two sides and two other circles of an equilateral triangle of side 100 mm.\n   (ii) Construct an involute of diameter 60 mm."
  },
  {
    "id": "pdf-page-11",
    "title": "ECO 271 — Urban and Regional Economics",
    "course": {
      "code": "ECO 271",
      "title": "Urban and Regional Economics"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Economics",
    "page": 11,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nDEPARTMENT OF ECONOMICS\nFIRST SEMESTER EXAMINATION, 2025/2026 SESSION\nCOURSE CODE: EBSU-ECO 271\nCOURSE TITLE: URBAN AND REGIONAL ECONOMICS\nEXAM DATE: 14th March, 2026 — DURATION: 2 Hours\n\nINSTRUCTIONS: Attempt two questions from each part.\n\nPART 1:\n1. Explain the following concepts of the Central Place Theory: (i) Central Place (ii) Threshold Population (iii) Range (iv) Order of service. (17.5 marks)\n2. (a) Mention and explain the three Pull Factors causing Rural–Urban Migration. (9 marks)\n   (b) List the three Push Factors responsible for Rural–Urban Migration. (8.5 marks)\n3. Discuss in detail the five Negative Transportation Externalities (Social Costs). (17.5 marks)\n\nPART 2:\n4. Explain five processes that transform rural areas into an urban centre. (17.5 marks)\n5. Discuss five characteristics of the urban informal sector. (17.5 marks)\n6. Enumerate and discuss four public policies towards housing provision at urban centres in Nigeria. (17.5 marks)"
  },
  {
    "id": "pdf-page-12",
    "title": "ECO 217 — Population Economics",
    "course": {
      "code": "ECO 217",
      "title": "Population Economics"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Economics",
    "page": 12,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nDEPARTMENT OF ECONOMICS\nFIRST SEMESTER EXAMINATION, 2025/2026 SESSION\nCOURSE: EBSU-ECO 217: POPULATION ECONOMICS\nDATE: 16/03/26 — DURATION: 2 Hours\n\nINSTRUCTION: Answer TWO questions only from EACH section.\n\nSECTION A\n(1)(a) Explain two effects of population explosion on the Nigerian economy. (6 marks)\nNigerian total population data: 2016: 188,666,931; 2017: 193,495,907; 2018: 198,387,623; 2019: 203,304,497; 2020: 208,327,405; 2021: 213,401,323; 2022: 218,538,246; 2023: 227,882,945.\n(b) What is the average population growth rate in this period, assuming the value for 2016 is 2.1%? (8 marks)\n(c) Compare Nigeria's population growth rates in the two periods 2016–2019 and 2020–2023. (3.5 marks)\n(2)(a) Differentiate between migration and net migration. (5.5 marks)\n(b) Explain the effects of a positive net migration on labour force and aggregate demand in Nigeria. (12 marks)\n(3)(a) Differentiate between morbidity and mortality. (5.5 marks)\n(b) Explain two types of morbidity and mortality each. (8 marks)\n(c) Highlight two impacts of morbidity and mortality each on the economy. (4 marks)\n\nSECTION B\n(4a) Use the data in Q1 to calculate the crude birth rates between 2016 and 2023 (take the population of the previous year as the population at the beginning of each year). (12 marks)\n(4b) Outline one importance and two limitations of the crude birth rate. (5½ marks)\n(5a) What is demographic data? (5 marks)\n(5b) State and explain five forms of demographic data. (12½ marks)\n(6) Explain briefly how fertility rate affects the Nigerian economy through the following variables: (i) Labour force (ii) Consumption (iii) Population growth (iv) Savings and investment."
  },
  {
    "id": "pdf-page-13",
    "title": "AMS 101 — Principles of Management (Set 2)",
    "course": {
      "code": "AMS 101",
      "title": "Principles of Management"
    },
    "faculty": "Faculty of Management Sciences",
    "department": "Department of Business Administration & Entrepreneurship",
    "page": 13,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF MANAGEMENT SCIENCES\nDEPARTMENT OF BUSINESS ADMINISTRATION & ENTREPRENEURSHIP\nFIRST SEMESTER EXAM 2025/2026 ACADEMIC SESSION\nCOURSE CODE: AMS 101 — COURSE TITLE: PRINCIPLES OF MANAGEMENT\nTIME ALLOWED: 2 HRS — DATE OF EXAM: 17/3/2025\n\nINSTRUCTION: Answer FOUR (4) questions ONLY. Do not copy questions into your script.\n\n1. (a) Define Principles of Management. (5 mks)\n   (b) Briefly explain the principles of management as propounded by Henri Fayol. (12.5 mks)\n2. (a) What do you understand by organisational structure? (5 mks)\n   (b) Clearly state the elements of organisational structure. (12.5 mks)\n3. (a) Define leadership as clearly as possible. (5 mks)\n   (b) State the basic ingredients of leadership. (12.5 mks)\n4. (a) Explain the term departmentalisation. (5 mks)\n   (b) Itemise and discuss the four basic ways an organisation can be departmentalised. (12.5 mks)\n5. (a) What do you understand by management development? (5 mks)\n   (b) State the problems associated with management development in Nigeria. (12.5 mks)\n6. (a) What are the common features in the definitions of management? (5 mks)\n   (b) Outline the basic scientific methods that qualify management as a science. (12.5 mks)"
  },
  {
    "id": "pdf-page-14",
    "title": "CMS 101 — Introduction to Human Communication",
    "course": {
      "code": "CMS 101",
      "title": "Introduction to Human Communication"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Mass Communication",
    "page": 14,
    "body": "Ebonyi State University, Abakaliki\nFaculty of Social Sciences and Humanities\nDepartment of Mass Communication\nCMS 101: Introduction to Human Communication\nFirst Semester Examination, 2025/2026 Session\nInstructions: Answer Question 1 and any other 3. Time Allowed: 2½ hours.\n\n1. Critically evaluate the concept of human communication by comparing at least three scholarly definitions. (15 marks)\n   (b) Explain how the key elements of human communication reveal the complexity of communication in human interaction. (10 marks)\n2. Examine the fundamental principles of human communication and analyse why communication is described as both symbolic and transactional, using relevant real-life examples. (15 marks)\n3. Critically discuss the major assumptions of psychosocial (eogenetic) theory and the contributions of humanistic theorists, and explain how these perspectives enhance our understanding of personality development and communication behaviour. (15 marks)\n4. Compare intrapersonal and interpersonal communication, explaining the role of self-concept, personal reflection, and feedback in shaping communication behaviour. (15 marks)\n5. Explain the content and relational dimensions of communication and analyse how both dimensions influence meaning and interpersonal understanding. (15 marks)\n6. Analyse the roles of communication competence, emotional intelligence, social intelligence, and mindful communication in achieving effective communication relationships. (15 marks)"
  },
  {
    "id": "pdf-page-15",
    "title": "IFT 211 — Digital Logic Design",
    "course": {
      "code": "IFT 211",
      "title": "Digital Logic Design"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Computer Science",
    "page": 15,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nDEPARTMENT OF COMPUTER SCIENCE\nFIRST SEMESTER EXAMINATION 2025/2026 SESSION\nDATE: 23 - 03 - 2026 — TIME: 2 HOURS\nCOURSE CODE: IFT 211 — COURSE TITLE: DIGITAL LOGIC DESIGN\nINSTRUCTION: Answer any four questions. All questions carry equal marks.\n\n1. (i) Differentiate with example(s) a digital system and an analog system.\n   (ii) What is the decimal equivalent of the hexadecimal number $4B3_{16}$?\n   (iii) Draw a system diagram and generate a truth table for the Boolean expression $X \\cdot Y \\oplus Y \\cdot Z + Z' \\cdot Y + X$.\n\n2. (i) Using sign, truth table and symbol, differentiate between an XOR-gate and an XNOR-gate.\n   (ii) In Boolean algebra, explain a literal, citing example(s).\n   (iii) Draw a system diagram and generate a truth table for the Boolean expression $X \\cdot Y + Y \\cdot Z + Z' \\cdot Y + X$.\n\n3. (i) State the commutative and distributive postulates.\n   (ii) What is the hexadecimal equivalent of the decimal number $3315_{10}$?\n   (iii) Draw a system diagram and generate a truth table for the Boolean expression $X \\cdot Y \\oplus Y \\cdot Z \\oplus Z' \\cdot Y$.\n\n4. (i) Explain the term Binary Coded Decimal (BCD) code.\n   (ii) What do you understand by noise margin in circuit propagation?\n   (iii) Draw a system diagram and generate a truth table for the Boolean expression $X' + Y' \\oplus Y \\cdot Z + Z' \\cdot Y$.\n\n5. (i) Define the following terms used in digital logic design: (a) Propagation delay (b) Fan-in (c) Fan-out.\n   (ii) Draw a system diagram and generate a truth table for the Boolean expression $X \\cdot Y \\oplus Y + Z \\oplus Z' + Y$.\n   (iii) Explain the operation of a NOT-gate.\n\n6. (i) What do you understand by circuit minimisation?\n   (ii) Draw a system diagram and generate a truth table for the Boolean expression $X' \\cdot Y' \\oplus Y \\cdot Z \\oplus Z' + Y$.\n   (iii) Explain the operation of a NAND-gate."
  },
  {
    "id": "pdf-page-16",
    "title": "MCM 205 — Techniques in Book Publishing",
    "course": {
      "code": "MCM 205",
      "title": "Techniques in Book Publishing"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Mass Communication",
    "page": 16,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nDEPARTMENT OF MASS COMMUNICATION — FACULTY OF SOCIAL SCIENCES AND HUMANITIES\nFIRST SEMESTER EXAMINATION\nTECHNIQUES IN BOOK PUBLISHING — MCM 205\n23/3/2026 — TIME ALLOWED: 2 hrs\n\nInstruction: Answer Question 1 and any other three (3) questions.\n\n1. \"Book publishing is a profession.\" What is your take on this statement? What are the five (5) opportunities available for a professional in book publishing? (25 Marks)\n2. Explain book publishing procedure to a layman. (15 Marks)\n3. Compliance with the law is fundamental in book publishing. Explain how Copyright Law impacts on book publishers. (15 Marks)\n4. Explain the meaning of a book with 5 key points. (15 Marks)\n5. The emergence of Artificial Intelligence has made book publishing a lot easier. Do you agree? Give five reasons for your answer. (15 Marks)\n6. What are the challenges facing book publishers in Nigeria? (15 Marks)"
  },
  {
    "id": "pdf-page-17",
    "title": "SOC 303/321 — Sociology of Crime and Delinquency",
    "course": {
      "code": "SOC 303/321",
      "title": "Sociology of Crime and Delinquency"
    },
    "faculty": "Faculty of Humanities and Social Sciences",
    "department": "Department of Sociology",
    "page": 17,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF HUMANITIES AND SOCIAL SCIENCES\nDEPARTMENT OF SOCIOLOGY\n2025/2026 FIRST SEMESTER EXAMINATION\nCOURSE CODE: SOC 303/SOC 321 — COURSE TITLE: Sociology of Crime and Delinquency\nTIME: 2 hours — Date of Exam: 23rd March, 2026\nINSTRUCTION: Answer Question ONE and any other TWO questions.\n\n1(a) The Criminal Justice System (CJS) can be defined as the formal structure of institutions or coordinated network of agencies charged with the responsibility of discharging varied duties for the state. With this in mind, clearly and in chronological order, explain the interplay between those agencies towards effective societal functioning. (20 marks)\n(b) Criminal laws in modern societies are naturally imbued with loopholes which lawyers or criminals usually exploit to free their clients or themselves from criminal misconduct. Identify and explain at least five (5) of those loopholes as they exist in criminal law. (10 marks)\n\n2(a) For a criminal law to be operational and effective, it must possess certain characteristics. Identify and explain these characteristics in detail. (8 marks)\n(b) As discussed in class, explain who a criminal is. (3 marks)\n(c) Discuss the roles of criminal law in modern societies. (3 marks)\n(d) Throw light on what Brown et al. (1991) meant by defining crime as those acts persons perform or fail to perform. (6 marks)\n\n3. In every human society, certain acts are regarded as criminal while some are not. Identify and explain five (5) make-ups of crime that differentiate it from non-criminal behaviour. (15 marks)\n(b) \"No crime without the stipulation of law.\" Discuss. (5 marks)\n\n4(a) Clearly explain the difference between crime and delinquency. (6 marks)\n(b) Crime and deviance are said to be relative to time and place. Discuss with examples close to you. (5 marks)\n(c) Single-parenting, broken homes and lack of parental attachment are said to be the major predisposing factors to juvenile delinquency. Discuss. (9 marks)\n\n5(a) Many approaches have been put forward to explain the antisocial activities of children and young persons. Identify and explain those approaches of delinquency as discussed in class. (12 marks)\n(b) Write short notes on the following spatial distribution of crime: (i) Age and Crime (4 marks) (ii) Sex and Crime (4 marks)"
  },
  {
    "id": "pdf-page-18",
    "title": "CHM — Organic Chemistry (Amines, Stereoisomerism, Alcohols)",
    "course": {
      "code": "CHM",
      "title": "Organic Chemistry — Amines, Stereoisomerism and Alcohols"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Chemistry",
    "page": 18,
    "body": "SECTION A. Fill in your answers in the spaces provided. Each answer carries one (1) mark.\n\n1. Which class of amines reacts fastest with HCl?\n2. When amines react with acid chloride, the products obtained are ____ and ____.\n3. The products formed from the acid-catalysed hydrolysis of ethyl ethanoate are ____ and ____.\n4. t-Butylamine is in ____ class of amine.\n5. The least basic compound among propylaniline, propylamine, ammonia and diethylamine is ____.\n6. $$\\text{____} + 4[\\text{H}] \\xrightarrow{\\text{Na}/\\text{C}_2\\text{H}_5\\text{OH}} \\text{RCH}_2\\text{NH}_2 + \\text{H}_2\\text{O}$$\n7. In the presence of nickel and hydrogen, carboxylic acid can be reduced to ____ + ____.\n8. $$\\text{RCN} + 4[\\text{H}] \\xrightarrow{\\text{LiAlH}_4} \\text{____}$$\n9. The end-product of acid or alkaline catalysed hydrolysis of cyanides is ____.\n10. The by-product formed when carboxylic acid reacts with alkali is ____.\n11. With Hofmann's method, which of these classes of amines can be prepared?\n12. The class of amine that is soluble in diethyl oxalate is ____.\n13. Write the chemical equation for the preparation of an epoxide from an alcohol.\n14. Isomerism is classified into ____ and ____.\n15. A substance which has the ability to rotate the plane of polarised light is said to be ____.\n16. A molecule containing four chiral centres can give rise to a maximum of ____ optical isomers.\n17. Stereoisomers that are not mirror images of each other are called ____.\n18. Arrange the substituents in Cahn–Ingold–Prelog (CIP) priority sequence in decreasing order of priority: $-\\text{NH}_2$, $-\\text{OH}$, $-\\text{CH}_3$, $-\\text{I}$, $-\\text{H}$, $-\\text{F}$, $-\\text{COOH}$, $-\\text{CH}_2\\text{OH}$.\n19. Meso compounds are always achiral even though they have two or more stereogenic carbons. True/False.\n20. Illustrate the isomers that exist in 3-hexene.\n21. The separation of one or both enantiomers from a racemic mixture is called ____.\n22. A $1.20\\,\\text{g}$ sample of cocaine, $[\\alpha]_D = -16^{\\circ}$, was dissolved in $7.50\\,\\text{mL}$ of chloroform and placed in a sample tube of path length $5.0\\,\\text{cm}$. Calculate the observed rotation.\n23. Ketones are organic compounds having the ____ functional group.\n24. Furfural is an example of the ____ class of organic compounds.\n25. Ketones are prepared by the oxidation of ____.\n26. Reduction of acid chlorides with $\\text{LiAlH}_4$ leads to the formation of ____.\n27. The reaction of phenol with benzoyl chloride in alkaline medium gives ____.\n28. Give one example of an alcohol containing more than one hydroxyl group.\n29. Alcohols behave as ____ bases in the presence of very strong acid.\n30. Give the compound formed when phenol is treated with bromine in water.\n31. Cyclohexanol reacts with $\\text{K}_2\\text{Cr}_2\\text{O}_7 / \\text{H}^+$ to produce ____."
  },
  {
    "id": "pdf-page-19",
    "title": "AMB 231 — Basic Techniques in Microbiology",
    "course": {
      "code": "AMB 231",
      "title": "Basic Techniques in Microbiology"
    },
    "faculty": "Faculty of Science",
    "department": "Applied Microbiology Department",
    "page": 19,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF SCIENCE — APPLIED MICROBIOLOGY DEPARTMENT\nSESSION: 2025/2026 — FIRST SEMESTER EXAM\nCOURSE TITLE: BASIC TECHNIQUE IN MICROBIOLOGY\nCOURSE CODE: AMB 231\nTIME ALLOWED: 2 HOURS — DATE: 25th MARCH 2026\nINSTRUCTION: Attempt FOUR (4) questions only.\n\n1(a) Briefly discuss three (3) major methods of isolating microorganisms in the laboratory; explain the principle of each. (9 mks)\n(b) Enumerate five (5) examples of microorganisms and state their Gram reactions. (8½ mks)\n\n2(a) List and explain five (5) culture media used in the microbiology laboratory. (10 mks)\n(b) Discuss in a step-by-step manner the Gram staining technique used for bacterial classification. (7½ mks)\n\n3(a) Define the following: (i) Microbiology (ii) Microscopy (iii) A colony (iv) Microbial isolation (v) Enumeration of microorganisms (vi) Agglutination (vii) Pure culture. (13½ mks)\n(b) Elucidate the importance of isolating microorganisms in microbiological studies; highlight any four key reasons. (4 mks)\n\n4(a) Mention any 10 processes/procedures involved in the isolation of microorganisms. (10 mks)\n(b) Elucidate eight (8) characteristics used to carry out colonial morphology when cultured on solid media. (7½ mks)\n\n5(a) Explain the detailed procedures of cryopreservation and lyophilisation in microbial preservation and state one advantage and one limitation of each. (9½ mks)\n(b) Describe the agar well diffusion technique and explain how it can be applied in determining the minimum bactericidal concentration (MBC) of a crude extract. (8 mks)\n\n6(a) Describe a standard method for the cultivation of obligate anaerobes (add a labelled diagram of the suitable equipment). (9½ mks)\n(b) State four important reasons for preserving microorganisms. (8 mks)\n\nGOOD LUCK!"
  },
  {
    "id": "pdf-page-20",
    "title": "Civil Procedure — Pleadings and Practice",
    "course": {
      "code": "PPL",
      "title": "Civil Procedure — Pleadings and Practice"
    },
    "faculty": "Faculty of Law",
    "department": "Department of Public and Private Law",
    "page": 20,
    "body": "23. State at least two differences between a Witness Statement on Oath and an Affidavit.\n(b) What is the content of the first and last paragraphs of an Affidavit?\n\n24. Okeke purchased a car from a shop owned by Okafor for ₦2,000,000. The agreement was that he would repay after six months, but he was unable to. Prior to this, Okafor had borrowed ₦1,000,000 from Okeke and was yet to pay back. Okafor now intends to bring an action before the Ebonyi State High Court to recover the car sum.\n(a) What is the appropriate mode of commencement?\n(b) What type of pleading will serve as the most appropriate form of defence for the defendant?\n\n25. State at least 4 types of pleadings.\n\n25A. You are a lead counsel to a 100-level law student arrested by the LAWSA Police for violation of the LAWSA dress code. The matter has been filed at the SUG High Court registry of Ebonyi State University. The matter is slated for trial and called up. His Lordship Chidera Igboke, immediately after the appearance from the Prosecution Counsel, ordered you to leave the courtroom for not being properly dressed and chewing gum during a court session.\n(a) Raise a preliminary objection on the jurisdiction of the court to entertain the matter.\n(b) Assuming you were a co-counsel, what will be required of you after the sending out of your lead counsel?\n\n26. State the likely outcomes of a preliminary objection.\n27. What are the accompanying documents of a writ of summons?\n28. List at least 5 types of jurisdiction and briefly explain each.\n29. What is the proper mode of commencing a fundamental human rights action?\n30. What is the full name of the Honourable Attorney General of Ebonyi State?\n\nSection B\nJohn Okoroafor, a 300-level student of the Faculty of Law, Ebonyi State University, has been arrested for wearing a red tie and a short-sleeve shirt. There has been a clamour on the failure of the Attorney General to prosecute him."
  },
  {
    "id": "pdf-page-21",
    "title": "PPL 311 — Criminal Law",
    "course": {
      "code": "PPL 311",
      "title": "Criminal Law"
    },
    "faculty": "Faculty of Law",
    "department": "Department of Public and Private Law",
    "page": 21,
    "body": "FACULTY OF LAW — EBONYI STATE UNIVERSITY, ABAKALIKI\n1st SEMESTER EXAMINATION 2025/2026 SESSION\nCriminal Law — PPL 311 — Date: 23/03/2026 — Time: 3 hrs\nInstruction: Answer 4 questions.\n\n1(a) Jackson's father has a yam barn at Azugwu and sent Jackson to fetch some tubers. On reaching Azugwu, Jackson unknowingly entered Nwibo's barn (close to his father's) and collected four fat tubers. Nwibo raised an alarm and Jackson was arrested. His explanation that he thought the barn was his father's was not convincing to the police, and he was charged with stealing at Magistrate's Court No. 10 Azugwu. With the aid of decided cases, state the defence available to Jackson.\n(b) What will be the position of the law if Jackson had set out to steal yams from Nwogbaga's barn and mistakenly entered Nwibo's barn and stole some tubers and was arrested and charged?\n\n2. Abi was returning from his farm when he met Nweke, who started pursuing him with a long knife. Abi ran for safety, but Nweke kept pursuing him and blocked him in a corner where escape was difficult. Abi picked up an empty beer bottle and hit Nweke's head. Nweke fell and died before he could be taken to the hospital. Abi has been arrested and charged with murder. What defence, if any, is available to Abi at the trial?\n(b) What will be the position of the law if Nweke was pursuing Abi with a cane and Abi in turn killed him?\n(c) What will be the defence of Abi if he killed Nweke while Nweke was burning down his two-storey building?\n\n3. A, B and C held a meeting with the sole agendum of robbing Canada Bank at Ikwo. On the agreed date, C was sick and did not participate. D, a bank worker, gave information about where the bank vault's key was kept; E opened the door to the manager's office where the vault was; F drove the robbers to a safe place after the robbery. All six were arrested. C's defence: he was sick. D's defence: he merely gave information. E's defence: he merely opened the door. F's defence: he only drove the robbers. Analyse, with decided cases, the defences raised by C, D, E and F.\n\n4(a) Nwuzor is a security officer attached to Spera Indeo Company at Ikwo. His hours of duty are usually 6pm–5am every day. On a particular day he was sick around 11pm and permitted to go home. On reaching home, he saw a man making love with his wife. He used his knife and killed the man instantly, and the wife escaped. He was arrested and charged with murder. What will be your defence?\n(b) Would your defence in (a) be the same if Nwuzor had seen the man, gone to a nearby shop to take local gin, and only killed the man as he was leaving the compound?\n\n5. Write short notes on the following: (a) Intention (b) Motive in criminal trial (c) Recklessness.\n\n6. Discuss the following: (a) Strict liability offences (b) Classification of offences (c) Burden of proof in criminal trial."
  },
  {
    "id": "pdf-page-22",
    "title": "BCH 403 — Biochemistry of Macromolecules",
    "course": {
      "code": "BCH 403",
      "title": "Biochemistry of Macromolecules"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Biochemistry",
    "page": 22,
    "body": "EBONYI STATE UNIVERSITY — FACULTY OF SCIENCE — DEPARTMENT OF BIOCHEMISTRY\nSession: 2025/2026 — Semester: FIRST — Date: 27/03/2026\nCourse Code: BCH 403 — Course Title: Biochemistry of Macromolecules — Time: 2 Hours — Credit Unit: 2\nInstruction: Answer any FOUR questions.\n\n1(a) Explain with biochemical examples the molecular role of the following macromolecules: (i) Nucleic acids — DNA and RNA; (ii) Proteins — Transport and Regulatory Proteins.\n(b) Using a biochemical structure only, give a full explanation of a storage polysaccharide — amylose.\n\n2(a) Describe vividly the molecular domain of glycoproteins, especially in specific organelles.\n(b) Using a biochemical structure only, differentiate between the N- and O-linkages in glycoproteins.\n\n3(a) Briefly explain the synthesis of a named complex lipid — phosphatidylserine.\n(b) Explain the biochemical implication of chylomicrons transporting dietary lipids from intestine to peripheral tissues.\n\n4(a) Show the structures of the following: (i) RNA (ii) DNA.\n(b) DNA was isolated from abattoirs in France and Nigeria. If sample A contains 15% adenine and sample B contains 35% adenine, which sample came from the abattoir in Nigeria? Justify using Chargaff's rule.\n\n5(a) A protein contains an antigen. Using the knowledge of antigen–antibody reaction, describe a protein separation that can be used to separate such a protein.\n(b) In the hospital, a certain technique is used in cleansing the kidney when it is weak. Discuss.\n\n6(a) Given an alanine–glycine–glycine–alanine tetrapeptide, show the equation of the reaction forming this peptide.\n(b) Using (i) Sanger's reagent (ii) Edman's reagent, determine at least the first amino acid in the tetrapeptide.\n\nLECTURERS: Dr. B.U. Nwali & Dr. N. Edwin\nGOODLUCK FROM HOD — ASSOC. PROF. B.U. NWALI"
  },
  {
    "id": "pdf-page-23",
    "title": "BCH 205 — Introduction to Molecular Biology",
    "course": {
      "code": "BCH 205",
      "title": "Introduction to Molecular Biology"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Biochemistry",
    "page": 23,
    "body": "EBONYI STATE UNIVERSITY — DEPARTMENT OF BIOCHEMISTRY\nSession: 2025/2026 — Semester: FIRST — Date: 27/03/2026\nCourse Code: BCH 205 — Course Title: Introduction to Molecular Biology — Time: 2 Hours — Credit Unit: 2\nInstruction: Answer any FOUR questions.\n\n1(a) Explain the following structural features of a living cell: (i) Plasma membrane (ii) Cytoplasm (iii) Mitochondria (iv) Golgi apparatus.\n\n2(a) With the aid of a molecular illustration, explain the term Gene Expression.\n(b) Enunciate briefly the molecular role of a ribosome.\n\n3(a) Define the term Cellular Memory.\n(b) List and explain the functional features of cellular memory.\n\n4(a) Briefly describe four models of the cell membrane.\n(b) Mention five (5) examples of energy transformation on Earth.\n(c) What do you understand by the following terms: (i) Active transport (ii) Osmosis (iii) Diffusion.\n\n5(a) What is a molecular motor and state its operating principle.\n(b) Mention two (2) examples each of biological and artificial motors.\n(c) What do you understand by the term cloning and state three (3) types of cloning.\n\n6(a) What do you understand by the following terms: (i) Cell cycle (ii) Cell signalling (iii) Signal transduction (iv) Stem cells.\n(b) State four (4) types of cell signalling.\n\nLECTURERS: Dr. B.U. Nwali & Dr. N. Edwin\nGOODLUCK FROM HOD — ASSOC. PROF. B.U. NWALI"
  },
  {
    "id": "pdf-page-24",
    "title": "MCM 213 — Public Relations Writing",
    "course": {
      "code": "MCM 213",
      "title": "Public Relations Writing"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Mass Communication",
    "page": 24,
    "body": "EBONYI STATE UNIVERSITY — FACULTY OF SOCIAL SCIENCES AND HUMANITIES — DEPARTMENT OF MASS COMMUNICATION\nFIRST SEMESTER EXAMINATION, 2024/2025 SESSION\nMCM 213: PUBLIC RELATIONS WRITING\nINSTRUCTION: Answer Question 1 and any other 2. TIME: 2 HOURS — DATE: 26/03/2026\n\n1. Find the correct answers to the questions below (30 mks):\n(i) PROs use image-building techniques to establish ____ between an organisation and its publics. (a) positive relationship (b) ugly experience (c) youthful experience (d) customer expectations (e) painful experience\n(ii) ____ information is information that the PRO has no control over once placed in the media. (a) Digital (b) Paper work (c) Uncontrolled (d) Social Media (e) Nonverbal\n(iii) One reason uncontrolled information is used by the PRO is that it is ____. (a) digital (b) cheaper (c) uncontrolled (d) white (e) beautiful\n(iv) A good example of uncontrolled information is ____. (a) News (b) gossip (c) Press Release (d) Facebook (e) letter\n(v) Two examples of controlled information are ____. (a) House publication & Brochure (b) News & Brochure (c) research & newspaper (d) Facebook page & Broadcast News (e) Advertising and Press Release\n(vi) Which of these is NOT a tool for public relations writing? (a) Backgrounder (b) Advertising (c) Press Release (d) Articles & Editorials (e) Curriculum\n(vii) ____ is in-depth factual writing that provides context about a company, product, person or issue to support press releases and media kits. (a) Brochure (b) News (c) Research (d) Backgrounder (e) Advertising\n(viii) Which of these is to be paid for by a PRO? (a) Brochure (b) Collateral publication (c) Press Release (d) Backgrounder (e) Advertising\n(ix) Public relations writing is meant specifically to inform and persuade the target audience to ____ towards the organisation. (a) Balance action (b) gossip (c) Release News (d) take positive action (e) entertain audience\n(x) The elements of public relations writing are Purpose, Medium, Style or format and ____. (a) Strategy (b) covenant (c) conductor (d) concord (e) machine\n(xi) ____ & ____ are examples of press releases. (a) House publication & Brochure (b) News & Brochure (c) Product & Financial Release (d) Print & Broadcast News (e) positive & negative action\n(xii) Press Release is written in ____ form. (a) on-top pyramid (b) triangular (c) inverted pyramid (d) product line (e) executive summary\n(xiii) Communication in a company could be vertical or ____. (a) Horizontal (b) Triangular (c) Circle (d) Oblong (e) Tall\n(xiv) An example of vertical communication is between ____. (a) people of the same cadre (b) politicians (c) students (d) lecturers (e) the boss and his subordinate\n(xv) Which is NOT a form of communication in a workplace? (a) Intrapersonal (b) Interpersonal (c) Group (d) Public Speaking (e) Controversial\n\n2. Prepare a good programme for the 2nd phase of NAMAC's Inter-Level Debate and Speech Competition, indicating the time each event will be featured. (30 mks)\n3. State and explain 3 reasons why PROs love using uncontrolled information even when they do not have total control of the time and context of the message. (20 mks)\n4. Write a good backgrounder of not more than one page on the just-concluded Inter-Level Debate and Speech Competition. (20 mks)\n5. Briefly explain to a 100-level Mass Communication student why Public Relations Officers write Press Releases in an inverted pyramid form. (20 mks)"
  },
  {
    "id": "pdf-page-25",
    "title": "ENT 311 — Venture Creation",
    "course": {
      "code": "ENT 311",
      "title": "Venture Creation"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Chemistry",
    "page": 25,
    "body": "EBONYI STATE UNIVERSITY — FACULTY OF SCIENCE — DEPARTMENT OF INDUSTRIAL CHEMISTRY\nFIRST SEMESTER EXAMINATION 2024/2025 SESSION\nCOURSE CODE: ENT 311 — COURSE TITLE: VENTURE CREATION\nTIME: 2 HOURS — DATE: 26/03/2026\nINSTRUCTION: Answer any FOUR questions.\n\n1(a) Define digital innovation.\n(b) List and explain in detail five foundations of technology-driven entrepreneurship. (17.5 MARKS)\n\n2(a) List and explain five digital technologies transforming modern entrepreneurship.\n(b) Differentiate between freemium and on-demand service models. (17.5 MARKS)\n\n3(a) What is opportunity identification?\n(b) Discuss five key sources of opportunities in Nigeria.\n(c) List six major characteristics of 21st-century entrepreneurs. (17.5 MARKS)\n\n4(a) Discuss five tools used for opportunity identification.\n(b) What is venture capital?\n(c) As a young entrepreneur, list six major ways you can raise capital for your start-up. (17.5 MARKS)\n\n5(a) Define negotiation in a business context and give one example.\n(b) Give three differences between competitive and collaborative negotiation strategies.\n(c) Outline the stages involved in the negotiation process.\n(d) Explain the following leadership styles in small business: (i) Transformational (ii) Transactional (iii) Democratic. (17.5 MARKS)\n\n6(a) Assuming you have a small business on campus: (i) list three ways to advertise your business; (ii) what type of e-commerce model would you use and why; (iii) mention two effective ways to retain your customers.\n(b) (i) With an example, define First Mover Advantage. (ii) Mention two advantages and two risks of First Mover Advantage. (17.5 MARKS)"
  },
  {
    "id": "pdf-page-26",
    "title": "AMB 231 — Basic Techniques in Microbiology (Set 2)",
    "course": {
      "code": "AMB 231",
      "title": "Basic Techniques in Microbiology"
    },
    "faculty": "Faculty of Science",
    "department": "Applied Microbiology Department",
    "page": 26,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFACULTY OF SCIENCE — APPLIED MICROBIOLOGY DEPARTMENT\nSESSION: 2025/2026 — FIRST SEMESTER EXAM\nCOURSE TITLE: BASIC TECHNIQUE IN MICROBIOLOGY — COURSE CODE: AMB 231\nTIME ALLOWED: 2 HOURS — DATE: 25th MARCH 2026\nINSTRUCTION: Attempt FOUR (4) questions only.\n\n(Identical question set to AMB 231 — Page 19. See that paper for the full questions.)\n\nGOOD LUCK!"
  },
  {
    "id": "pdf-page-27",
    "title": "ICH 291/207 — General Chemistry Practical III",
    "course": {
      "code": "ICH 291/207",
      "title": "General Chemistry Practical III"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Industrial Chemistry",
    "page": 27,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — FACULTY OF SCIENCE — DEPARTMENT OF INDUSTRIAL CHEMISTRY\nFIRST SEMESTER EXAMINATION, 2025/2026 SESSION\nCOURSE CODE: ICH 291/207 — COURSE TITLE: GENERAL CHEMISTRY PRACTICAL III\nDATE: 26-03-2026 — TIME ALLOWED: 2 HRS\nINSTRUCTION: Answer Question 1 and any other three questions.\n\nQUESTION 1 (25 marks)\nFrom your titration readings:\n(i) State the title of the experiment.\n(ii) Calculate the partition coefficient between the two immiscible solvents.\n(iii) Define partition coefficient.\n(iv) Why must the mixture of n-butanol and water be thoroughly shaken and allowed to stand before analysis?\n\nQUESTION 2 (15 marks)\n(a) Boric acid was distributed between water and pentanol at $25^{\\circ}\\text{C}$. The concentration in water was $0.0510\\,\\text{mol/L}$ and in pentanol $0.0155\\,\\text{mol/L}$. Calculate the partition coefficient. (5 marks)\n(b) State the partition law. (4 marks)\n(c) List three important principles of the partition law. (6 marks)\n\nQUESTION 3 (15 marks)\nHydrogen gas is collected over water with the following data: mass of $\\text{Mg} = 0.060\\,\\text{g}$, volume $= 60\\,\\text{cm}^{3}$, temperature $= 25^{\\circ}\\text{C}$, atmospheric pressure $= 760\\,\\text{mmHg}$, vapour pressure $= 24\\,\\text{mmHg}$. Calculate $R$. ($1\\,\\text{atm} = 760\\,\\text{mmHg}$).\n\nQUESTION 4 (15 marks)\n(a) A student reacts $0.036\\,\\text{g}$ of magnesium with excess dilute HCl and collects $36\\,\\text{cm}^{3}$ of hydrogen gas at STP. Calculate the molar volume of hydrogen. (7 marks)\n(b) State four colligative properties. (8 marks)\n\nQUESTION 5 (15 marks)\n(a) Define: (i) Calorimetry (ii) Calorimeter (iii) Neutralisation reaction. (3 marks each = 9 marks)\n(b) Give an example of a neutralisation reaction using a balanced chemical equation. (3 marks)\n(c) State the equation used to represent the amount of heat transferred from a calorimeter. (3 marks)\n\nQUESTION 6 (15 marks)\n(a) Define: (i) Heat capacity (ii) Heat of neutralisation. (4 marks each = 8 marks)\n(b) If the mass of the solution of NaOH and HCl is $100\\,\\text{g}$ and the temperature change is $5^{\\circ}\\text{C}$, with specific heat capacity $4.2\\,\\text{J/g}^{\\circ}\\text{C}$, calculate the heat liberated. ($q = mc\\Delta T$). (7 marks)"
  },
  {
    "id": "pdf-page-28",
    "title": "LIN 307 — Digital Linguistics",
    "course": {
      "code": "LIN 307",
      "title": "Digital Linguistics"
    },
    "faculty": "Faculty of Humanities",
    "department": "Department of Languages and Linguistics",
    "page": 28,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — DEPARTMENT OF LANGUAGES AND LINGUISTICS\n2025/2026 FIRST SEMESTER EXAMINATION\nCOURSE: LIN 307: DIGITAL LINGUISTICS\nTIME ALLOWED: 2 Hours — DATE: 30-03-2026\n\nSECTION A: Answer Question 1 and any other two of your choice.\n1(a) Write the following in full: DLx, ELAN, FLEx, AntConc, Webonary.\n(b) What is Digital Linguistics?\n2(a) From an etymological perspective, what does \"digital\" mean?\n(b) Intelligently and succinctly, distinguish between DLx and Computational Linguistics.\n3. In what ways does the integration of digital technologies transform traditional humanities into Digital Humanities?\n4. Critically evaluate the ethical implications of DLx in relation to data privacy, digital divide, and technological bias. How can these issues be mitigated?\n5. Write short notes on any two: (i) FLEx (ii) AntConc (iii) Voyant.\n\nSECTION B: Attempt all questions.\n1) Digital technologies involve the use of all of the following except ____. (a) the internet (b) mobile phones (c) computer (d) carbon dating\n2) Digital learning is any type of learning that uses ____. (a) technology (b) transmitter (c) media (d) interactive board\n3) Well-known examples of digital technology include ____. (a) stethoscope (b) digital beads (c) online games (d) TV cartoons\n4) Humanities are academic disciplines that study aspects of ____. (a) human being and their welfare (b) human society and culture (c) humanity and history (d) society and development\n5) The humanities use methods that are primarily ____. (a) speculative (b) objective (c) verifiable (d) empirical\n6) Natural sciences use mainly ____ approaches. (a) methodological (b) empirical (c) theoretical (d) lab\n7) Digital is opposed to ____. (a) finger (b) manual (c) physical (d) analog\n8) Digital, extended metaphorically, refers to that which is composed of ____ especially in the form of binary digits. (a) data (b) keyboard (c) digital buttons (d) screen\n9) Digital is defined as something characterised by widespread use of ____. (a) Information (b) computers (c) social media (d) optical fibres\n10) Linguistics studies language from both ____ and ____ perspectives. (a) diachronic and synchronic (b) historical and comparative (c) digital and non-digital (d) human and animal\n11) Diachronic linguistics studies language from the perspective of its development over ____. (a) space (b) time (c) digital space (d) electronic technology\n12) DLx is the science of digital data management for ____. (a) linguistics (b) data storage (c) data distribution (d) humanities\n13) The study of large amounts of electronic texts is known as ____. (a) computational linguistics (b) application of computer (c) corpus linguistics (d) textual linguistics\n14) Evolution of language implies ____ of language. (a) extinction (b) birth (c) production (d) preservation\n15) Concordance refers to an ____ list of the words (especially the important ones) present in a text. (a) sequential (b) alphabetical (c) annotated (d) abridged"
  },
  {
    "id": "pdf-page-29",
    "title": "BCH 305/317 — Structure and Functions of Nucleic Acids",
    "course": {
      "code": "BCH 305/317",
      "title": "Structure and Functions of Nucleic Acids"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Biochemistry",
    "page": 29,
    "body": "EBONYI STATE UNIVERSITY — FACULTY OF SCIENCE — DEPARTMENT OF BIOCHEMISTRY\nSession: 2025/2026 — Semester: FIRST — Date: 30/03/2026\nCourse Code: BCH 305/317 — Course Title: Structure and Functions of Nucleic Acids — Time: 2 Hours — Credit Unit: 2\nInstruction: Answer any FOUR questions.\n\n1(a) Give the sources of the elemental components of the purine ring during purine nucleotide de novo biosynthesis and structurally represent them.\n(b) With biochemical structures, trace the pathway for the breakdown of hypoxanthine to uric acid.\n(c) Structurally represent the de novo pathway for the synthesis of AMP from IMP.\n\n2(a) Illustrate the regulatory mechanisms in the biosynthesis of adenine and guanine nucleotides.\n(b) Give the structures of the following: (i) Aminopterin (ii) PRPP (iii) N-carbamoylaspartate.\n\n3(a) Trace the reaction sequence for the reduction of ribonucleotides to deoxyribonucleotides.\n(b) Structurally represent the reaction sequence for the synthesis of dTMP and show the site of inhibition of methotrexate.\n(c) Trace the pathway for the synthesis of dUMP from CMP.\n\n4(a) Explain the roles of DNA and RNA, stating clearly the role of codons in protein synthesis.\n(b) Show the structures of: (i) d-guanosine (ii) adenosine monophosphate.\n\n5. Lesch–Nyhan syndrome and Primary Gout are among several disorders associated with inborn errors of nucleic acid metabolism. Discuss.\n\n6. Xeroderma pigmentosum is a genetic disorder. Discuss this statement with emphasis on the causes, symptoms and the affected genes.\n\nLECTURERS: Prof. C.E. Offor & Assoc. Prof. N.N. Ezeani\nGOODLUCK FROM HOD — ASSOC. PROF. B.U. NWALI"
  },
  {
    "id": "pdf-page-30",
    "title": "FIN 201/BAF 221/STAT 251 — Business Statistics",
    "course": {
      "code": "FIN 201",
      "title": "Business Statistics"
    },
    "faculty": "Faculty of Management Sciences",
    "department": "Department of Banking and Finance",
    "page": 30,
    "body": "DEPARTMENT OF BANKING AND FINANCE — FACULTY OF MANAGEMENT SCIENCES — EBONYI STATE UNIVERSITY, ABAKALIKI\nFIRST SEMESTER 2025/2026 EXAM — FIN 201 / BAF 221 / STAT 251 (Business Statistics) — Time: 2 Hrs\nINSTRUCTION: Answer all questions.\n\n1. (i) What do you understand by the term \"Statistics\"?\n(ii) Differentiate between the following:\n  (a) Primary and Secondary data\n  (b) Descriptive and Inductive statistics\n  (c) Discrete and Continuous variables\n  (d) Probabilistic and Non-Probabilistic sampling.\n\n2. The age distribution of 15 pupils in the Psychology Department of XYZ University is: 18, 20, 21, 23, 20, 23, 23, 19, 18, 21, 23, 23, 20, 21, 24. Calculate:\n(i) Mean\n(ii) Mean deviation\n(iii) Variance\n(iv) Standard deviation\n(v) Coefficient of variation.\n\n3. The weekly production of rice by Ebonyi Rice World Company (in tonnes) is:\n68, 79, 75, 73, 68, 93, 62, 59, 76, 75, 61, 78, 75, 75, 74, 77, 95, 74, 66, 60, 96, 62, 89, 97, 74, 85, 60, 65, 83, 75, 65, 67, 73, 81, 63, 81, 62, 57, 53, 77.\nYou are required to:\n(i) Construct the frequency distribution using a class interval of 5.\n(ii) Draw the histogram of the data.\n(iii) Draw the frequency polygon.\n\n4. With the aid of a diagram where necessary, explain:\n(i) Simple random sampling\n(ii) Stratified sampling\n(iii) Cluster sampling\n(iv) Systematic sampling\n(v) Multi-stage sampling."
  },
  {
    "id": "pdf-page-31",
    "title": "FIN 217 — Law of Banking I",
    "course": {
      "code": "FIN 217",
      "title": "Law of Banking I"
    },
    "faculty": "Faculty of Management Sciences",
    "department": "Department of Banking and Finance",
    "page": 31,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — FACULTY OF MANAGEMENT SCIENCES — DEPARTMENT OF BANKING AND FINANCE\nFIRST SEMESTER EXAMINATION 2025/2026\nCOURSE TITLE: LAW OF BANKING I — COURSE CODE: FIN 217\nInstructions: Attempt any five questions of your choice. All questions carry equal marks. Time: 2 hrs.\n\n1. Outline and discuss five types of banking laws and four sources of Nigerian banking laws. (b) What is corporate governance?\n2. Outline and explain five qualities of a valid contract. (b) State and discuss five purposes of corporate governance.\n3. Outline and explain five conditions that could give rise to a customer–banker relationship. (b) Meaning and advantages of guarantee to the world of business and banking sector in particular.\n4. Outline and explain seven advantages of a company over a partnership business. (b) Mention and discuss seven conditions under which a partnership business can be dissolved.\n5. List and explain in detail seven contents of a Memorandum of Association and seven contents of Articles of Association.\n6. List and explain four methods of appointment of an agent. (b) What are the duties of an agent to the principal and principal to an agent?\n7. What do negotiable instruments mean? (b) Outline and explain ways bankers secure their loans and advances."
  },
  {
    "id": "pdf-page-32",
    "title": "BAF 335/FIN 203 — Corporate Finance I",
    "course": {
      "code": "BAF 335",
      "title": "Corporate Finance I"
    },
    "faculty": "Faculty of Management Sciences",
    "department": "Department of Banking and Finance",
    "page": 32,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — FACULTY OF MANAGEMENT SCIENCES — DEPARTMENT OF BANKING AND FINANCE\nFIRST SEMESTER EXAM 2025/2026 SESSION — BAF 335/FIN 203 (Corporate Finance I)\nATTEMPT ANY FOUR QUESTIONS. TIME: 2 HOURS. DATE: 16/3/2026.\n\n1(a) Briefly define corporate finance.\n(b) List and discuss the finance functions.\n(c) Itemise the objectives of corporate finance.\n\n2(a) Explain the term financial market.\n(b) Discuss the various types of financial markets.\n(c) Why is common stock considered the most important source of corporate finance to a business?\n\n3(a) What is a second-tier market?\n(b) Vividly discuss the instruments of the money market.\n(c) List and explain the institutions that participate in the money market.\n\n4(a) Outline and explain five sources of short-term finance.\n(b) Differentiate between common stock and preference stock.\n(c) Briefly discuss primary and secondary markets.\n\n5(a) Briefly discuss the five sources of long-term finance.\n(b) Discuss the types of institutions that participate in the capital market.\n(c) Calculate the current yield of a 12% ₦10,000 debenture currently selling at ₦800.\nCurrent yield: $$\\text{CY} = \\frac{\\text{Annual coupon}}{\\text{Market price}} = \\frac{0.12 \\times 10{,}000}{800} = 0.15 = 15\\%.$$"
  },
  {
    "id": "pdf-page-33",
    "title": "CSC 315 — Design and Analysis of Algorithm",
    "course": {
      "code": "CSC 315",
      "title": "Design and Analysis of Algorithms"
    },
    "faculty": "Faculty of Science",
    "department": "Computer Science Department",
    "page": 33,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — FACULTY OF SCIENCE — COMPUTER SCIENCE DEPARTMENT\nFIRST SEMESTER EXAMINATION 2025/2026 SESSION — DATE: 01-04-2026\nEBSU-CSC 315: DESIGN AND ANALYSIS OF ALGORITHM\nTIME ALLOWED: 2 HRS — ANSWER ANY FOUR QUESTIONS\n\n1(a) What is an algorithm? (2½ marks)\n(b) List the problem-solving steps in algorithm design. (8 marks)\n(c) Design an algorithm and draw a flowchart to find the sum of three numbers. (6 marks)\n\n2(a) State five characteristics of a good algorithm. (5 marks)\n(b) Differentiate between time complexity and space complexity. (5 marks)\n(c) Define and explain the following cases in algorithm analysis: (i) Best case (ii) Worst case (iii) Average case. (7½ marks)\n\n3(a) Explain 4 reasons why worst-case analysis is considered in analysis.\n(b) What is algorithm correctness? (2½ marks)\n(c) State the importance of Algorithms in DAA. (1 mark each, 7 marks)\n\n4(a) What is a basic iterative algorithm? (2½ marks)\n(b) State five characteristics of a basic iterative structure. (5 marks)\n(c) Write an algorithm that prints numbers from 1 to 5 using a while-loop structure. (10 marks)\n\n5(a) List and explain the two main parts of correctness. (7 marks)\n(b) State the principle of optimality. (2½ marks)\n(c) Explain at least 4 properties of the principle of optimality. (8 marks)\n\n6(a) What is dynamic programming? (2½ marks)\n(b) Explain the following with examples: (i) Accessing an array element (ii) Linear search (iii) Merge sort (iv) Bubble sort. (12 marks)\n(c) What is the Travelling Salesman problem? (3 marks)\n\n…GOOD LUCK…"
  },
  {
    "id": "pdf-page-34",
    "title": "EEE 121 — X-Ray Diffraction and Analysis",
    "course": {
      "code": "EEE 121",
      "title": "X-Ray Diffraction and Analysis"
    },
    "faculty": "Faculty of Engineering",
    "department": "Electrical/Electronic Engineering Department",
    "page": 34,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI\nFIRST SEMESTER EXAMINATION 2025/2026 ACADEMIC SESSION\nFACULTY OF ENGINEERING — ELECTRICAL/ELECTRONIC ENGINEERING DEPARTMENT\nCOURSE CODE: EBSU-EEE 121 — LEVEL: 100L\nCOURSE TITLE: X-RAY DIFFRACTION AND ANALYSIS\nTIME: 3 HRS — INSTRUCTION: Answer any FOUR questions.\n\nQUESTION ONE\n(a) Explain the following: (i) Photoelectricity (ii) Work function (iii) Threshold frequency.\n(b) Caesium has a work function of $1.9\\,\\text{eV}$. Find:\n  (i) The longest wavelength that can cause photoelectric emission from a caesium surface.\n  (ii) The maximum kinetic energy.\n  (iii) The maximum velocity of the liberated electron when the metal is illuminated by light of wavelength $6.0 \\times 10^{-7}\\,\\text{m}$.\n  (iv) The stopping potential difference.\nConstants: $h = 6.6 \\times 10^{-34}\\,\\text{J s}$, $c = 3.0 \\times 10^{8}\\,\\text{m/s}$, $1\\,\\text{eV} = 1.6 \\times 10^{-19}\\,\\text{J}$, $e = 1.6 \\times 10^{-19}\\,\\text{C}$, $m_e = 9.1 \\times 10^{-31}\\,\\text{kg}$.\n\nQUESTION TWO\n(a) With the aid of a well-labelled diagram, explain the production of X-rays in the laboratory.\n(b) (i) State two health hazards of X-rays. (ii) State three precautionary measures. (iii) Give two devices used to detect X-rays.\n\nQUESTION THREE\n(a) In a tabular form, differentiate between gamma rays and X-rays under: (i) frequency (ii) production (iii) wavelength (iv) detection.\n(b) An X-ray tube operates at $40\\,\\text{kV}$ and the current through it is $5.0\\,\\text{mA}$. Calculate:\n  (i) the electrical power input,\n  (ii) the number of electrons striking the target per second,\n  (iii) the speed of the electrons when they hit the target,\n  (iv) the lower wavelength limit of the X-rays emitted.\n\nQUESTION FOUR\n(a) In tabular form, differentiate between the two types of X-rays under: (i) applied voltage (ii) frequency (iii) wavelength (iv) penetration power (v) production cathode.\n(b) Calculate the (i) kinetic energy, (ii) frequency, (iii) maximum velocity, (iv) wavelength of X-rays emitted when electrons are accelerated through $100\\,\\text{kV}$.\n\nQUESTION FIVE\n(a) State Bragg's Law.\n(b) With the aid of a diagram, derive Bragg's equation: $$n\\lambda = 2d\\sin\\theta.$$\n(c) State three (3) applications of Bragg's law.\n\nQUESTION SIX\n(a) State two reasons for the inclusion of this course (X-ray diffraction and analysis) in your curriculum.\n(b) Given very sharp peaks, sharp peaks, broad peaks, and amorphous outcomes from a diffractometer, what are the implications of the above?"
  },
  {
    "id": "pdf-page-35",
    "title": "CEE 111 — Civil Engineering Equipment",
    "course": {
      "code": "CEE 111",
      "title": "Civil Engineering Equipment"
    },
    "faculty": "Faculty of Engineering",
    "department": "Department of Civil Engineering",
    "page": 35,
    "body": "EBONYI STATE UNIVERSITY — FACULTY OF ENGINEERING\nFIRST SEMESTER EXAMINATION — DEPARTMENT: CIVIL ENGINEERING\nCOURSE: CEE 111 — CIVIL ENGINEERING EQUIPMENT\nINSTRUCTION: Answer ALL questions. TIME ALLOWED: 3 HOURS\n\n1. List two equipments used in the following areas: (i) Material handling and lifting (ii) Earth moving and excavation (iii) Concrete and paving (iv) Road and surface construction (v) Setting out. (10 marks)\n2. List and explain five importances of equipment in Civil Engineering works. (10 marks)\n3. List and explain four aspects of equipment quality. (10 marks)\n4. Mention the laboratory testing equipment used for the following: (i) Tensile, compression and bending test of materials. (ii) Strength of subgrade soil. (iii) To measure soil resistance. (iv) To measure soil bearing capacity. (10 marks)\n5(a) Five importances of regular maintenance of equipment and tools in Civil Engineering.\n(b) List five challenges of managing maintenance of tools and equipment. (20 marks)\n6. List five key principles of storage of equipment and tools in Civil Engineering. (10 marks)"
  },
  {
    "id": "pdf-page-36",
    "title": "GET 211/BUD 251/ESM 205 — Computer Programming & Software Engineering",
    "course": {
      "code": "GET 211",
      "title": "Computer Programming/Application and Software Engineering"
    },
    "faculty": "Faculty of Science",
    "department": "Computer Science Department",
    "page": 36,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — COMPUTER SCIENCE DEPARTMENT, FACULTY OF SCIENCE\nSECOND SEMESTER EXAMINATION 2023/2024 SESSION — DATE: 25/3/2026\nCOURSE CODE: GET 211/BUD 251/ESM 205 (Computer Programming/Application and Software Engineering) — TIME: 2 HRS\nINSTRUCTION: Answer any FOUR questions.\n\nQUESTION 1\n(A) List and explain five (5) major programming steps.\n(B) Write a simple QBASIC program to calculate the average of five (5) numbers.\n\nQUESTION 2\n(A) Highlight and explain any five (5) software development phases.\n(B) Briefly explain the following: (i) Software re-engineering (ii) Feasibility study (iii) Software documentation (iv) Software reuse.\n\nQUESTION 3\n(A) List and briefly explain five (5) major characteristics of good software and five (5) qualities of a good software project manager.\n(B) Write a simple QBASIC program to calculate the area of a rectangle (Base $B = 15$, Height $H = 8$).\n\nQUESTION 4\n(A) Briefly explain the following: (i) Variables (ii) Comments (iii) Operators (iv) Data types (v) Variable declaration.\n(B) With the aid of diagrams, briefly explain the following software design models: (i) Waterfall (ii) Prototype (iii) Evolutionary (iv) Spiral.\n\nQUESTION 5\n(A) Write a simple QBASIC program to add five (5) numbers ($N_1, N_2, N_3, N_4, N_5$).\n(B) List and explain four (4) operators used in programming/software development.\n\nQUESTION 6\n(A) Write a simple QBASIC program to allow users to display six (6) local governments in their state of origin.\n(B) Briefly highlight and explain the stages/phases of the history and evolution of programming languages."
  },
  {
    "id": "pdf-page-37",
    "title": "GET 101/FEG 303 — Engineer in Society",
    "course": {
      "code": "GET 101",
      "title": "Engineer in Society"
    },
    "faculty": "Faculty of Engineering & Environmental Sciences",
    "department": "General Engineering",
    "page": 37,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — FACULTY OF ENGINEERING & ENVIRONMENTAL SCIENCES\nSemester Examination Question Paper\nCourse Code: GET 101/FEG 303 — Course Title: Engineer in Society\n2025/2026 Session — First Semester — Date of Exam: 2nd April, 2026 — Time: 2 Hours\nInstruction: Attempt all questions in Section A and two questions in Section B.\n\nSECTION A (2 Marks Each)\n1. Engineering started with the following disciplines except: A. Civil B. Mechanical C. Agricultural D. Electrical and Electronic.\n2. Things that are difficult to explain but occur periodically are best described as: A. Science B. Facts C. Technology D. Research.\n3. The research conducted over years to understand already established facts is known as: A. Law of gravity B. Newton's law of motion C. Scientific law D. Ohm's law.\n4. Sciences that have direct application are referred to as: A. Pure science B. Applied science C. Physical science D. Biological science.\n5. The body of organised knowledge, tools and machines used by man to manipulate his environment to satisfy his basic needs is defined as: A. Technology B. Engineering C. Science D. Research.\n6. The 18th and 19th centuries marked the start of the: A. Beginning of Civil Engineering B. Beginning of Mechanical Engineering C. Beginning of Agricultural Engineering D. Industrial Revolution.\n7. The first engineering profession based on the knowledge and skill of art from a natural being: A. Craftsman B. Technician C. Technologist D. Engineer.\n8. Which of the following is the highest engineering professional body in Nigeria? A. NSE B. COREN C. NATE D. NISET.\n9. NSE was established in the year: A. 1958 B. 1960 C. 1968 D. 1970.\n10. The systematic approach to ecosystem management to reduce negative impact is known as: A. Pollution B. Environmental management C. Ecosystem D. Environmental control.\n11. Which of the following is NOT among the waste management strategies applied to control pollution? A. Replacement B. Reuse C. Reduction D. Recycling.\n12. The type of energy that exists in limited quantity and cannot be replenished on a human time scale: A. Biomass B. Wind C. Non-renewable D. Renewable.\n13. One of the major problems of solar energy is: A. High cost B. Lack of experts C. Weather dependence D. Lack of spare parts.\n14. The set of moral precepts and professional standards that direct engineers is known as: A. Literacy B. Engineering conduct C. Engineering guides D. Engineering ethics."
  },
  {
    "id": "pdf-page-38",
    "title": "GET 211/BUD 251/ESM 205 — Computer Programming (Set 2)",
    "course": {
      "code": "GET 211",
      "title": "Computer Programming/Application and Software Engineering"
    },
    "faculty": "Faculty of Science",
    "department": "Computer Science Department",
    "page": 38,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — COMPUTER SCIENCE DEPARTMENT, FACULTY OF SCIENCE\nSECOND SEMESTER EXAMINATION 2023/2024 SESSION — DATE: 25/3/2026\nCOURSE CODE: GET 211/BUD 251/ESM 205 — TIME: 2 HRS\nINSTRUCTION: Answer any FOUR questions.\n\n(Identical question set to GET 211 — Page 36. Six questions covering programming steps, QBASIC programs, software development phases, design models, operators, and history of programming languages.)"
  },
  {
    "id": "pdf-page-39",
    "title": "ECO 203/213 — Macroeconomic Theory I",
    "course": {
      "code": "ECO 203",
      "title": "Macroeconomic Theory I"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Economics",
    "page": 39,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — DEPARTMENT OF ECONOMICS\nFIRST SEMESTER EXAMINATION, 2024/2025 SESSION\nCOURSE: ECO 203/ECO 213 — MACROECONOMIC THEORY I — Date: 25/03/26\nINSTRUCTION: Answer any four questions.\n\n1(a) Define macroeconomics. How does it differ from microeconomics?\n(b) Highlight four broad objectives of macroeconomics.\n\n2(a) Define investment.\n(b) Enumerate and briefly explain four determinants of investment.\n\n3(a) What is the difference between GDP and GNP?\n(b) Given (in ₦ billion): Consumption $C = 500$; Investment $I = 200$; Government Purchases $G = 250$; Exports $X = 120$; Imports $M = 80$; Wages $W = 500$; Rental Income $R = 100$; Interest Income $i = 80$; Corporate Profits $PR = 200$; Depreciation $= 60$; Indirect Business Taxes $= 50$; Transfer Payments $= 40$; Personal Income Taxes $= 120$; Undistributed Profits $= 50$; Corporate Profit Taxes $= 40$; Social Security Contributions $= 30$. Calculate:\n  (i) GDP using the expenditure approach: $$\\text{GDP} = C + I + G + (X - M).$$\n  (ii) GDP using the income approach.\n  (iii) National income.\n  (iv) Personal income.\n  (v) Disposable income.\n\n4(a) Distinguish between nominal GDP and real GDP.\n(b) State why real GDP is a better measure than nominal GDP.\n(c) Identify and explain any two factors that can cause nominal GDP to increase.\n(d) Briefly explain any four transactions that are omitted from GDP calculations and why.\n\n5(a) Differentiate between the GDP deflator and CPI with the aid of a simple table.\n(b) List any seven factors affecting the cost of living.\n(c) Highlight any four uses of national income data.\n\n6(a) Mrs Okafor's salary was increased by 20%. Before the increment her salary was ₦150,000. After the increment, she increased her savings from ₦30,000 to ₦50,000. Find the $\\text{MPS}$ and $\\text{MPC}$.\nFormulas: $$\\text{MPC} = \\frac{\\Delta C}{\\Delta Y}, \\qquad \\text{MPS} = \\frac{\\Delta S}{\\Delta Y}, \\qquad \\text{MPC} + \\text{MPS} = 1.$$\n(b) Explain any four relations between APC, APS, MPC, and MPS."
  },
  {
    "id": "pdf-page-40",
    "title": "ECO 207 — Mathematical Economics I",
    "course": {
      "code": "ECO 207",
      "title": "Mathematical Economics I"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Economics",
    "page": 40,
    "body": "DEPARTMENT OF ECONOMICS — FACULTY OF SOCIAL SCIENCES AND HUMANITIES — EBONYI STATE UNIVERSITY, ABAKALIKI\nFIRST SEMESTER EXAMINATION, 2025/2026 SESSION — MARCH 24, 2026\nCOURSE: ECO 207 (MATHEMATICAL ECONOMICS I) — TIME: 2 HRS\nINSTRUCTION: Answer any TWO (2) questions from each section. All questions carry equal marks.\n\nSECTION A\n1. Given the optimisation function $$\\Pi = 320x - 6x^{2} - 4xy - 4y^{2} + 240y - 36$$ for a firm producing two products $x$ and $y$, find:\n(i) The optimal levels of the firm. (9.5 marks)\n(ii) Does the firm maximise profit or minimise costs? (4 marks)\n(iii) Find the total profit of the firm. (4 marks)\n\n2. Using the quotient rule, partially differentiate the following:\n(i) $$Z = \\frac{4x^{5} - 3x^{3}}{2x}$$ (9.5 marks)\n(ii) $$P = \\frac{8y^{3}}{4x - 10y}$$ (8 marks)\n\n3. Given the geometric sequence $2, 4, 8, 16, 32, \\ldots, 16384$, find the sum of the geometric progression:\n$$S_n = \\frac{a(r^{n} - 1)}{r - 1}.$$ (17.5 marks)\n\nSECTION B\n4. Factorise the following:\n(a) $$x^{3} + y^{3} = (x + y)(x^{2} - xy + y^{2})$$ (8.5 marks)\n(b) $$8a + 125ax^{3} = a\\,(2 + 5x)(4 - 10x + 25x^{2})$$ (9 marks)\n\n5. Given that the consumer's income is ₦100, with first and second prices ₦2 and ₦5 respectively, calculate the two quantities that maximise the consumer's utility. (17.5 marks)\n\n6. Assuming the utility function $$U = q_1 q_2$$ subject to budget constraint $$Y = P_1 Q_1 + P_2 Q_2,$$ find the two combinations of quantities demanded that satisfy the consumer's utility. (17.5 marks)"
  },
  {
    "id": "pdf-page-41",
    "title": "ECO 201/211 — Microeconomic Theory I",
    "course": {
      "code": "ECO 201",
      "title": "Microeconomic Theory I"
    },
    "faculty": "Faculty of Social Sciences and Humanities",
    "department": "Department of Economics",
    "page": 41,
    "body": "EBONYI STATE UNIVERSITY, ABAKALIKI — DEPARTMENT OF ECONOMICS\nFIRST SEMESTER EXAMINATION, 2024/2025 SESSION\nCOURSE: ECO 201/ECO 211 — MICROECONOMIC THEORY I — DATE: 26/03/26\nINSTRUCTION: Answer any FIVE questions.\n\n1(a) Explain the concepts of price effect, substitution effect, and income effect.\n(b) Show how the price effect is decomposed into substitution and income effects using the Hicksian approach for a fall in the price of a normal good.\n\n2(a) Define consumer surplus and explain it using a demand curve diagram.\n(b) The demand function for a commodity is given by $$Q = 200 - 4P.$$ If the equilibrium price is ₦30, calculate the consumer surplus using integration: $$CS = \\int_{P^*}^{P_{max}} Q(P)\\, dP.$$\n(c) A consumer's demand function is $$P = 150 - 5Q.$$ If the market price is ₦50, calculate the consumer surplus.\n\n3(a) Explain: (i) Price elasticity of demand (ii) Cross elasticity of demand (iii) Income elasticity of demand (iv) Price elasticity of supply.\n(b) Illustrate graphically when demand is: (i) Perfectly inelastic (ii) Unitary elastic (iii) Perfectly elastic.\n(c) Given the market demand $Q_d = 12 - 2P$, determine the arc elasticity of demand for a change in price from: (i) ₦5 to ₦4 (ii) ₦3 to ₦2. Comment on your answers.\nArc elasticity: $$E_a = \\frac{(Q_2 - Q_1)/[(Q_1 + Q_2)/2]}{(P_2 - P_1)/[(P_1 + P_2)/2]}.$$\n\n4(a) What is microeconomics?\n(b) Identify and explain five (5) importances of microeconomics.\n(c) Briefly discuss the scope of microeconomics.\n\n5(a) State the main argument of utility theory according to the cardinalists and the ordinalists.\n(b) State three features each of the cardinal and ordinal approaches.\n(c) Explain the concept of consumer equilibrium according to each approach.\n\n6(a) From the table below (Quantity, Total Utility, Marginal Utility), find A, B, C, D, E:\n  Q=1: TU=50, MU=50; Q=2: TU=A, MU=45; Q=3: TU=130, MU=B; Q=4: TU=C, MU=20; Q=5: TU=D, MU=15; Q=7: TU=195, MU=E.\n  Recall: $$MU_n = TU_n - TU_{n-1}.$$\n(b) Explain the following terms: (i) Indifference curve (ii) Indifference map (iii) Budget line (iv) Marginal rate of substitution."
  },
  {
    "id": "pdf-page-42",
    "title": "ANA 311 — Respiratory Histology (MCQs 59–65)",
    "course": {
      "code": "ANA 311",
      "title": "Respiratory System Histology — MCQs"
    },
    "faculty": "Faculty of Basic Medical Sciences",
    "department": "Department of Anatomy",
    "page": 42,
    "body": "ANA 311 — Ebonyi State University\nRespiratory System Histology — Multiple Choice Questions\n\n59. Which part of the respiratory system is responsible for the primary site of gas exchange?\nA. Bronchioles  B. Alveoli  C. Terminal bronchioles  D. Trachea\nAnswer: B\n\n60. The blood–air barrier in the alveoli is composed of:\nA. Simple columnar epithelium\nB. Pseudostratified columnar epithelium\nC. Type I pneumocytes, endothelial cells, and a basement membrane\nD. Type II pneumocytes and smooth muscle\nAnswer: C\n\n61. In which part of the respiratory system does cartilage disappear?\nA. Primary bronchi  B. Secondary bronchi  C. Terminal bronchioles  D. Respiratory bronchioles\nAnswer: C\n\n62. The main component of the basement membrane in the alveolar–capillary barrier is:\nA. Collagen type I  B. Collagen type II  C. Collagen type IV  D. Elastin\nAnswer: C\n\n63. The alveolar septum is composed of:\nA. Fibrous connective tissue and goblet cells\nB. Smooth muscle and elastic fibres\nC. Capillaries, fibroblasts, and elastic fibres\nD. Cartilage and epithelial cells\nAnswer: C\n\n64. The ciliated epithelium of the trachea functions to:\nA. Secrete surfactant  B. Trap and remove particulates  C. Produce mucus  D. Enhance gas exchange\nAnswer: B\n\n65. The functional unit of the lung is the:\nA. Bronchus  B. Alveolus  C. Bronchiole  D. Respiratory bronchiole\nAnswer: B\n\nSource: studentsdash.com | ANA 311 — Ebonyi State University"
  },
  {
    "id": "pdf-page-43",
    "title": "CSC 231 — Data Types, Queues & Programming Methodologies (Part 1)",
    "course": {
      "code": "CSC 231",
      "title": "Programming Languages and Data Structures"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Computer Science",
    "page": 43,
    "body": "CSC 231 — Ebonyi State University (Solutions Pack — Part 1)\n\nQuestion 2 (continued)\nAn Abstract Data Type (ADT) is a data type defined by its behaviour rather than its implementation. It specifies the operations that can be performed on it and the constraints that apply, providing a well-defined interface for working with the data.\n\n(b) Simple vs Complex Abstract Data Types\n• Simple ADTs are built into a programming language and are not composed of other data types. Examples: integers, floats, characters, booleans.\n• Complex ADTs are composed of other data types and defined by their behaviour. Examples: arrays, lists, stacks, queues — used to organise and manipulate large amounts of data in a structured manner.\n\n(c) Three Features of Program Translators\n1. Translation: Converts code from one language to another (e.g. compiling source code into object code).\n2. Optimisation: Improves efficiency and performance of the translated code (e.g. loop unrolling, register allocation).\n3. Error Checking: Detects and reports errors — syntax, type, and semantic checking.\n\nQuestion 3\n(a) Uses of Queue Functions\n(i) Queue — creates a new Queue data structure to store ordered items.\n(ii) Enqueue — adds an item to the end of the Queue.\n(iii) Dequeue — removes and returns the item at the front of the Queue.\n(iv) Length — returns the number of items currently in the Queue.\n(v) is_empty() — returns True if the Queue is empty, False otherwise.\n\n(b) Primitive vs Non-Primitive Data Structures\n• Primitive: basic types built into a language — integers, floats, characters, booleans. Simple, fixed in size, used for basic operations.\n• Non-primitive: complex types composed of other types — arrays, lists, stacks, queues. Used for databases, trees, and graphs.\n\nQuestion 4 — Programming Methodologies\n1. Concurrent Programming — executes multiple tasks at the same time. Used in operating systems and real-time applications. Achieved through threads, processes, or coroutines.\n2. Scripting Programming — writes scripts to automate tasks or add functionality. Scripts are interpreted rather than compiled and are used in file processing, system administration, and web development.\n3. Event-Driven Programming — responds to user actions or system events. Common in GUIs and web applications. Uses callbacks and event handlers."
  },
  {
    "id": "pdf-page-44",
    "title": "CSC 231 — Programming Methodologies (Part 2)",
    "course": {
      "code": "CSC 231",
      "title": "Programming Languages and Data Structures"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Computer Science",
    "page": 44,
    "body": "CSC 231 — Ebonyi State University (Solutions Pack — Part 2)\n\nQuestion 4 (continued)\n4. Object-Oriented Programming (OOP) — focuses on creating objects that are instances of classes encapsulating data and behaviour. Based on abstraction, encapsulation, inheritance, and polymorphism.\n5. Procedural Programming — organises code into procedures or functions that are called in sequence to perform tasks. The program follows a step-by-step approach.\n\nSource: studentsdash.com | CSC 231 — Ebonyi State University"
  },
  {
    "id": "pdf-page-45",
    "title": "CSC 231 — Levels of Programming Languages",
    "course": {
      "code": "CSC 231",
      "title": "Programming Languages and Data Structures"
    },
    "faculty": "Faculty of Science",
    "department": "Department of Computer Science",
    "page": 45,
    "body": "CSC 231 — Past Questions and Answers\nEbonyi State University (EBSU) — Computer Science\n\nQuestion 1\n(i) Explain the three levels of programming languages with examples.\n\nSOLUTION\n(i) Machine Language — the lowest level. Consists of binary code, directly executed by the computer's hardware. Example: 0101010101010101.\n(ii) Assembly Language — a low-level language more readable than machine language. Uses symbols to represent hardware instructions. Example: ADD AX, BX — adds the contents of the AX and BX registers.\n(iii) High-Level Language — closer to human language and easier to read/write than low-level languages. Examples: Python, Java, C++. Example statement: print('Hello, World!') in Python.\n\n(B) Advantages and Features of Programming Languages\nAdvantages:\n1. Efficiency — allows developers to create optimised code that performs complex tasks quickly.\n2. Portability — programs in high-level languages can run on different hardware and operating systems.\n3. Maintainability — allows developers to easily modify and update code.\n\nFeatures:\n1. Syntax — a specific set of rules (keywords, operators, punctuation) the code must follow.\n2. Data Types — integers, floats, strings, booleans, etc., used to store and manipulate data.\n\n(C) Attributes of Computer Program Variables\n(i) Name — the identifier used to represent a variable in a program.\n(ii) Address — the memory location where the value of a variable is stored.\n(iii) Type — the data type of a variable (integer, float, string), which determines size and format.\n(iv) Scope — the part of the program where a variable can be accessed (global or local).\n(v) Lifetime — the duration a variable exists in memory (static or dynamic).\n\nQuestion 2\n(a) What is an Abstract Data Type? — See Page 43 for the complete answer."
  },
  {
    "id": "pdf-page-46",
    "title": "ANA 311 — Respiratory Histology (MCQs 52–58)",
    "course": {
      "code": "ANA 311",
      "title": "Respiratory System Histology — MCQs"
    },
    "faculty": "Faculty of Basic Medical Sciences",
    "department": "Department of Anatomy",
    "page": 46,
    "body": "52. The primary component of the respiratory membrane that prevents alveolar collapse is:\nA. Type I pneumocytes  B. Surfactant  C. Collagen fibres  D. Capillary endothelium\nAnswer: B\n\n53. Which of the following statements about the trachealis muscle is true?\nA. It is composed of skeletal muscle\nB. It relaxes during coughing\nC. It connects the ends of the tracheal cartilage rings\nD. It is absent in the bronchi\nAnswer: C\n\n54. Which cells in the respiratory epithelium secrete mucus?\nA. Alveolar macrophages  B. Type I pneumocytes  C. Goblet cells  D. Clara cells\nAnswer: C\n\n55. The primary function of the nasal mucosa is:\nA. Gas exchange  B. Filtration, humidification, and warming of air  C. Producing surfactant  D. Generating immune responses\nAnswer: B\n\n56. The bronchi are histologically distinguished from the trachea by:\nA. The absence of cartilage\nB. The presence of a well-developed muscularis layer\nC. The lack of submucosal glands\nD. The presence of simple squamous epithelium\nAnswer: B\n\n57. Which cells in the alveoli remove debris and pathogens?\nA. Clara cells  B. Type II pneumocytes  C. Alveolar macrophages  D. Fibroblasts\nAnswer: C\n\n58. The respiratory bronchioles differ from the terminal bronchioles by the presence of:\nA. Goblet cells  B. Cilia  C. Alveoli  D. Hyaline cartilage\nAnswer: C"
  },
  {
    "id": "pdf-page-47",
    "title": "ANA 311 — Respiratory Histology (MCQs 44–51)",
    "course": {
      "code": "ANA 311",
      "title": "Respiratory System Histology — MCQs"
    },
    "faculty": "Faculty of Basic Medical Sciences",
    "department": "Department of Anatomy",
    "page": 47,
    "body": "44. The adventitia of the trachea contains:\nA. Dense irregular connective tissue  B. Smooth muscle  C. Serous glands  D. Elastic fibres\nAnswer: A\n\n45. Which of the following structures is lined by simple squamous epithelium?\nA. Trachea  B. Primary bronchi  C. Alveoli  D. Terminal bronchioles\nAnswer: C\n\n46. Which of the following is absent in bronchioles?\nA. Smooth muscle  B. Goblet cells  C. Cartilage  D. Elastic fibres\nAnswer: C\n\n47. The epiglottis is composed of:\nA. Hyaline cartilage  B. Elastic cartilage  C. Fibrocartilage  D. Dense connective tissue\nAnswer: B\n\n48. The primary defence mechanism of the respiratory system against pathogens is:\nA. Alveolar macrophages  B. Ciliary clearance  C. Mucus secretion  D. All of the above\nAnswer: D\n\n49. Which structure contains the least amount of smooth muscle?\nA. Bronchi  B. Terminal bronchioles  C. Respiratory bronchioles  D. Alveolar ducts\nAnswer: D\n\n50. The trachea bifurcates at which vertebral level?\nA. C4  B. T1  C. T4–T5  D. L1\nAnswer: C\n\n51. The epithelium of the bronchi gradually transitions from pseudostratified columnar to:\nA. Simple squamous  B. Simple columnar  C. Stratified squamous  D. Transitional epithelium\nAnswer: B"
  },
  {
    "id": "pdf-page-48",
    "title": "ANA 311 — Respiratory Histology (MCQs 37–43)",
    "course": {
      "code": "ANA 311",
      "title": "Respiratory System Histology — MCQs"
    },
    "faculty": "Faculty of Basic Medical Sciences",
    "department": "Department of Anatomy",
    "page": 48,
    "body": "37. The smallest airways that do not contain alveoli are the:\nA. Primary bronchi  B. Terminal bronchioles  C. Respiratory bronchioles  D. Alveolar ducts\nAnswer: B\n\n38. In the alveoli, surfactant is primarily composed of:\nA. Mucopolysaccharides  B. Proteins  C. Phospholipids  D. Collagen\nAnswer: C\n\n39. The transition from conducting to respiratory airways occurs at the:\nA. Terminal bronchioles  B. Respiratory bronchioles  C. Primary bronchi  D. Trachea\nAnswer: B\n\n40. The alveolar–capillary barrier is composed of:\nA. Type I pneumocytes, endothelial cells, and a shared basement membrane\nB. Goblet cells, alveolar macrophages, and capillaries\nC. Type II pneumocytes, fibroblasts, and elastic fibres\nD. Ciliated epithelial cells and connective tissue\nAnswer: A\n\n41. Which cells are primarily responsible for repair of damaged alveolar epithelium?\nA. Type I pneumocytes  B. Type II pneumocytes  C. Alveolar macrophages  D. Fibroblasts\nAnswer: B\n\n42. The respiratory mucosa contains which specialised feature to trap and remove particulates?\nA. Goblet cells and cilia  B. Type II pneumocytes  C. Alveolar pores  D. Macrophages\nAnswer: A\n\n43. The primary function of the nasal conchae is to:\nA. Produce mucus  B. Create air turbulence for filtration and humidification  C. Detect odours  D. Assist in speech\nAnswer: B"
  },
  {
    "id": "pdf-page-49",
    "title": "ANA 311 — Respiratory Histology (MCQs 30–36)",
    "course": {
      "code": "ANA 311",
      "title": "Respiratory System Histology — MCQs"
    },
    "faculty": "Faculty of Basic Medical Sciences",
    "department": "Department of Anatomy",
    "page": 49,
    "body": "30. The presence of smooth muscle is most prominent in:\nA. The alveoli  B. The terminal bronchioles  C. The trachea  D. The pleura\nAnswer: B\n\n31. The lamina propria of the trachea contains:\nA. Dense irregular connective tissue  B. Loose connective tissue with elastic fibres  C. Hyaline cartilage  D. Simple squamous epithelium\nAnswer: B\n\n32. Which of the following is absent in the alveolar walls?\nA. Type I pneumocytes  B. Capillary endothelium  C. Goblet cells  D. Elastic fibres\nAnswer: C\n\n33. Which structure is responsible for equalising air pressure between adjacent alveoli?\nA. Alveolar macrophages  B. Type II pneumocytes  C. Pores of Kohn  D. Lamina propria\nAnswer: C\n\n34. The most numerous immune cells found in the alveoli are:\nA. Neutrophils  B. Eosinophils  C. Alveolar macrophages  D. Basophils\nAnswer: C\n\n35. The serous membrane covering the lungs is the:\nA. Perichondrium  B. Pericardium  C. Pleura  D. Peritoneum\nAnswer: C\n\n36. The function of elastic fibres in the alveolar walls is to:\nA. Provide structural support  B. Enhance mucus secretion  C. Aid in lung recoil during exhalation  D. Prevent infection\nAnswer: C"
  },
  {
    "id": "pdf-page-50",
    "title": "ANA 311 — Respiratory Histology (MCQs 22–29)",
    "course": {
      "code": "ANA 311",
      "title": "Respiratory System Histology — MCQs"
    },
    "faculty": "Faculty of Basic Medical Sciences",
    "department": "Department of Anatomy",
    "page": 50,
    "body": "22. Which cells are responsible for phagocytosing pathogens in the alveoli?\nA. Type I pneumocytes  B. Alveolar macrophages  C. Type I pneumocytes  D. Ciliated columnar cells\nAnswer: B\n\n23. Which lung structure lacks cartilage support?\nA. Primary bronchi  B. Secondary bronchi  C. Terminal bronchioles  D. Trachea\nAnswer: C\n\n24. The respiratory epithelium contains basal cells, which function as:\nA. Mucus-secreting cells  B. Sensory receptors  C. Stem cells for epithelial renewal  D. Surfactant-producing cells\nAnswer: C\n\n25. The function of the nasal conchae is to:\nA. Trap dust and pathogens  B. Produce mucus  C. Create turbulence to warm and humidify air  D. Detect odour molecules\nAnswer: C\n\n26. The epithelium of the true vocal cords is primarily:\nA. Pseudostratified columnar epithelium  B. Stratified squamous epithelium  C. Simple squamous epithelium  D. Transitional epithelium\nAnswer: B\n\n27. Which respiratory structure marks the transition from conducting zone to respiratory zone?\nA. Terminal bronchioles  B. Respiratory bronchioles  C. Alveolar ducts  D. Secondary bronchi\nAnswer: B\n\n28. The most abundant type of pneumocyte in the alveoli is:\nA. Type I pneumocytes  B. Type II pneumocytes  C. Goblet cells  D. Clara cells\nAnswer: A\n\n29. The function of type I pneumocytes is:\nA. Surfactant production  B. Mucus secretion  C. Gas exchange  D. Immune defence\nAnswer: C"
  }
] satisfies BuiltInPastQuestion[];

export function getBuiltInPastQuestion(id: string) {
  return builtInPastQuestions.find((item) => item.id === id) ?? null;
}
