"use strict";
/* Emergency Management and Traffic Management content (YMT). Wording is taken verbatim from the controlled documents:
   ERP J1084-HSE-PLN-YMT-0002 Appendix A (contacts, Genus personnel left out – public link) and Appendix B Rev 1 25/09/2026 (situation cards),
   and TARP J1084-HSE-TRP-YMT-0001 Rev A. Update this file when those documents are revised. */
const EMERG={
 "site": {
  "address": "Yerramullah Terminal (YMT) construction site, Cowalla Road, Hill River WA 6521",
  "directions": "Approx. 15 km from the Brand Highway turnoff via Cowalla Road  |  Shire of Dandaragan",
  "plus": "M83P+PRV",
  "gps": "30.3456° S, 115.3370° E",
  "lat": -30.3456,
  "lon": 115.337,
  "meet": "YMT Primary Site Entry gate, Cowalla Road – escort vehicle (UHF + mobile, hazard lights on) to meet and guide",
  "alarm": "UHF Channel 24 – “Emergency, Emergency, Emergency” – state your ID, location and nature of the emergency",
  "muster": [
   "Primary – Site Office Muster Point (south of compound, beyond LV parking).",
   "Alternate – west side of site office compound.",
   "Remote work fronts – green cone."
  ],
  "ambulance": "St John from Moora – est. 30–40 min response. RFDS available for critical trauma.",
  "when000": [
   "Is someone seriously injured or in need of urgent medical help?",
   "Is your life or property being threatened?",
   "Have you just witnessed a serious accident or crime?"
  ],
  "when000note": "If you answered YES to any one of these, call Triple Zero (000). Triple Zero calls are free. Stay focused, stay relevant, stay on the line.",
  "source": "J1084-HSE-PLN-YMT-0002 Rev 1 — Emergency Response Plan, Appendix A | ERP Rev 1 │ 25/09/2026 | Review Date: 09/10/2026"
 },
 "cards": [
  {
   "title": "FIRE / EXPLOSION",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Alert and attempt to evacuate nearby personnel within the vicinity of the affected area;"
        ],
        [
         1,
         "Immediately notify the emergency services (if required);"
        ],
        [
         1,
         "When contacting emergency services, state the following:"
        ],
        [
         2,
         "Your name;"
        ],
        [
         2,
         "Company name;"
        ],
        [
         2,
         "Address of incident and site address and Plus Code M83P+PRV;"
        ],
        [
         2,
         "Types of injuries (if any); and"
        ],
        [
         2,
         "Any other relevant information."
        ],
        [
         1,
         "Where safe to do so shutdown plant and equipment;"
        ],
        [
         1,
         "Where safe to do so isolate power and ignition sources;"
        ],
        [
         1,
         "Attempt to contain, control, and extinguish the fire (if safe to do so);"
        ],
        [
         1,
         "Emergency warden/s will raise the alarm and proceed with evacuation of personnel to the designated 'Muster Point';"
        ],
        [
         1,
         "If possible, do not let the fire get between you and the escape route;"
        ],
        [
         2,
         "If trapped by bushfire – seek shelter, move to burnt ground where the fire has already passed or get to a body of water."
        ],
        [
         1,
         "Ensure the safety and well-being of personnel and attend to any injuries (first aider);"
        ],
        [
         1,
         "Secure the scene and assist external emergency services; and"
        ],
        [
         1,
         "Commence a roll call of personnel, contractors, and visitors and any missing persons."
        ]
       ],
       [
        [
         0,
         "First Responder"
        ]
       ]
      ],
      [
       [
        [
         0,
         "After the all-clear is given by the emergency services and/or the Emergency Response Team"
        ],
        [
         1,
         "Debrief workers;"
        ],
        [
         1,
         "Ensure a controlled and orderly approach to returning to work;"
        ],
        [
         1,
         "Ensure preservation of site and evidence and provide cooperation with internal and statutory investigations; and"
        ],
        [
         1,
         "Identify any damaged areas and ensure they are barricaded and or locked until repairs have been undertaken (if necessary)."
        ]
       ],
       [
        [
         0,
         "Emergency Response Team / SHEQ / Management"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "fire",
   "icon": "flame"
  },
  {
   "title": "MEDICAL EMERGENCY",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Check for threatening situations and remove persons from danger;"
        ],
        [
         1,
         "Remain with casualty and provide them with support;"
        ],
        [
         1,
         "If injured person is conscious, try to ascertain what condition the affected person is suffering;"
        ],
        [
         1,
         "Immediately contact the first aider/s for assistance;"
        ],
        [
         1,
         "Follow DRSABCD:"
        ],
        [
         2,
         "Danger: Check for danger & ensure the area is safe for yourself, bystanders, and the individual;"
        ],
        [
         2,
         "Response: Check for a response from the individual;"
        ],
        [
         2,
         "Send for Help: Call Triple Zero (000) or send someone to call. If you must leave an unconscious, breathing casualty to call for help, first place them in the recovery position;"
        ],
        [
         2,
         "Airways: Open the individual's mouth and check for foreign material;"
        ],
        [
         2,
         "Breathing: Check for breathing: Look, listen and feel for 10 seconds;"
        ],
        [
         2,
         "CPR: 30 chest compressions, followed by 2 breaths. Continue until help arrives, individual starts breathing, or you are physically unable to continue; and"
        ],
        [
         2,
         "Defibrillator: Apply defibrillator as soon as possible and follow the voice prompts."
        ],
        [
         1,
         "Where required, contact emergency services;"
        ],
        [
         1,
         "When contacting emergency services, state the following;"
        ],
        [
         2,
         "Your name & Company name;"
        ],
        [
         2,
         "Address of incident and site address and Plus Code M83P+PRV;"
        ],
        [
         2,
         "Description of injuries (if any); and"
        ],
        [
         2,
         "Any other relevant information."
        ],
        [
         1,
         "Stay in communication until told otherwise;"
        ],
        [
         1,
         "Reassure the individual; and"
        ],
        [
         1,
         "Stay with the individual until medical aid arrives."
        ]
       ],
       [
        [
         0,
         "First Responder / Emergency Response Team"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "medical",
   "icon": "plus"
  },
  {
   "title": "MENTAL HEALTH (PSYCHOSOCIAL) EMERGENCY",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Seek assistance from a trained 'Mental Health First Aider'."
        ],
        [
         1,
         "Follow ALGEE:"
        ],
        [
         2,
         "Approach the person, assess, and assist with any crisis;"
        ],
        [
         2,
         "Listen and communicate non-judgementally;"
        ],
        [
         2,
         "Give support and information;"
        ],
        [
         2,
         "Encourage the person to get appropriate professional help;"
        ],
        [
         3,
         "Provide details of our Employee Assistance Program (EAP): Drake Wellbeing Hub — (P) 1300 135 600, (E) intake@drakewellbeinghub.com.au, (W) www.drakewellbeinghub.co.au"
        ],
        [
         2,
         "Encourage other supports; and"
        ],
        [
         3,
         "Make the individual aware of other supports which may be helpful to them e.g. Mates in Construction – 1300 642 111; Beyond Blue – 1300 224 636"
        ],
        [
         2,
         "Let them know you will follow up with them at an agreed on time and seek agreement from them."
        ]
       ],
       [
        [
         0,
         "First Responder / Mental Health First Aider / Supervisors / SHEQ / HR"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Critical Event — When an individual is suffering acute mental health distress or is threatening self-harm or harm to others:"
        ],
        [
         1,
         "Contact a Supervisor/SHEQ/HR as soon as possible;"
        ],
        [
         1,
         "Stay with the individual. Ask a colleague to stay with them even if you only have to leave for a short time;"
        ],
        [
         1,
         "If the crisis is severe enough to require emergency professional help, contact emergency services immediately;"
        ],
        [
         1,
         "Try to make the person in distress safe. If possible, keep them away from dangerous objects;"
        ],
        [
         1,
         "Stay with/monitor the individual (if it is safe to do so) until emergency services arrive;"
        ],
        [
         1,
         "Provide a handover to emergency services – describe the individual's symptoms and behaviours. Do not attempt to make a diagnosis, leave this to suitably trained professionals; and"
        ],
        [
         1,
         "Your role as a first aider finishes when you hand over emergency services."
        ]
       ],
       [
        [
         0,
         "First Responder / Mental Health First Aider / Supervisors / SHEQ / HR"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "mental",
   "icon": "users"
  },
  {
   "title": "SNAKE BITE",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Follow DRSABCD:"
        ],
        [
         2,
         "Danger: Check for danger & ensure the area is safe for yourself, bystanders, and the individual;"
        ],
        [
         2,
         "Response: Check for a response from the individual;"
        ],
        [
         2,
         "Send for Help: Call Triple Zero (000) or send someone to call. If you must leave an unconscious, breathing casualty to call for help, first place them in the recovery position;"
        ],
        [
         2,
         "Airways: Open the individual's mouth and check for foreign material;"
        ],
        [
         2,
         "Breathing: Check for breathing: Look, listen and feel for 10 seconds;"
        ],
        [
         2,
         "CPR: 30 chest compressions, followed by 2 breaths. Continue until help arrives, individual starts breathing, or you are physically unable to continue; and"
        ],
        [
         2,
         "Defibrillator: Apply defibrillator as soon as possible and follow the voice prompts."
        ],
        [
         1,
         "Contact Emergency Services (000 / UHF);"
        ],
        [
         1,
         "Lie the individual down and ask them to keep still;"
        ],
        [
         1,
         "Reassure the individual;"
        ],
        [
         1,
         "If the bite is on a limb, apply an elasticated roller bandage (10-15cm wide) over the bite as soon as possible;"
        ],
        [
         1,
         "Apply a further elasticated roller bandage (10-15cm wide), starting just above the fingers or toes and moving upwards on the bitten limb, as far as can be reached:"
        ],
        [
         2,
         "Apply the bandage as firmly as possible to the limb. You should be unable to easily slide a finger between the bandage and the skin."
        ],
        [
         1,
         "Immobilise the bandaged limb using splints;"
        ],
        [
         1,
         "Write down the time of the bite and when the bandage was applied. If possible, mark the location of the bite site (if known) on the skin with a pen, or take a photograph of the bite site;"
        ],
        [
         1,
         "Do not wash venom off the skin or clothes because it can assist with identification of the snake; and"
        ],
        [
         1,
         "Stay with the individual until medical aid arrives."
        ]
       ],
       [
        [
         0,
         "First Responder / Emergency Response Team"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "snake",
   "icon": "alert"
  },
  {
   "title": "ELECTROCUTION / ELECTRIC SHOCK",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Check for danger & ensure the area is safe for yourself, bystanders, and the individual:"
        ],
        [
         2,
         "Look first, don't touch - the person may still be in contact with the electricity, and if you touch them, you will get an electric shock;"
        ],
        [
         2,
         "Isolate the power source, if possible;"
        ],
        [
         2,
         "Ensure the immediate safety of any persons in the vicinity, getting them to evacuate if safe to do so;"
        ],
        [
         2,
         "If the individual is in contact with high voltage lines, do not approach them. Wait until power is disconnected by authorised electrical personnel;"
        ],
        [
         2,
         "If safe to do so, remove the casualty from the electrical supply without directly touching them:"
        ],
        [
         3,
         "Use dry, non-conductive materials, for example, a crook, & move the electricity source away;"
        ],
        [
         3,
         "Use extreme caution if the skin at the point of contact or the ground is wet, as water conducts electricity; and"
        ],
        [
         3,
         "Ensure all plant is isolated and has been made safe."
        ],
        [
         1,
         "Follow DRSABCD:"
        ],
        [
         2,
         "Danger: Check for danger & ensure the area is safe for yourself, bystanders, and the individual;"
        ],
        [
         2,
         "Response: Check for a response from the individual;"
        ],
        [
         2,
         "Send for Help: Call Triple Zero (000) or send someone to call. If you must leave an unconscious, breathing casualty to call for help, first place them in the recovery position;"
        ],
        [
         2,
         "Airways: Open the individual's mouth and check for foreign material;"
        ],
        [
         2,
         "Breathing: Check for breathing: Look, listen and feel for 10 seconds;"
        ],
        [
         2,
         "CPR: 30 chest compressions, followed by 2 breaths. Continue until help arrives, individual starts breathing, or you are physically unable to continue; and"
        ],
        [
         2,
         "Defibrillator: Apply defibrillator as soon as possible and follow the voice prompts; and"
        ],
        [
         2,
         "Always seek medical aid immediately for electrical burns."
        ],
        [
         1,
         "Cool any burnt areas with copious amounts of cool water for up to twenty (20) minutes;"
        ],
        [
         1,
         "Remove any clothing and jewellery from the affected area unless stuck to the burn;"
        ],
        [
         1,
         "Cover burnt area with a light non-stick dressing or clean, dry non-fluffy material; and"
        ],
        [
         1,
         "Reassure the casualty."
        ]
       ],
       [
        [
         0,
         "First Responder / Emergency Response Team"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Fallen Power Lines:"
        ],
        [
         1,
         "When calling Triple Zero (000) advise that there are downed cables;"
        ],
        [
         1,
         "Phone Western Power on 13 13 51 (or the Western Power network operations contact in Appendix A for YMT interface works) to report the fallen powerline and make the area safe;"
        ],
        [
         1,
         "Remain at least 8 metres from any cable and do not approach until advised that it is safe to do so;"
        ],
        [
         1,
         "DO NOT attempt to remove the cable;"
        ],
        [
         1,
         "If a vehicle is being touched by a high voltage cable, DO NOT go near the vehicle, or try to remove the casualty from the vehicle;"
        ],
        [
         1,
         "Advise the individual not to move; and"
        ],
        [
         1,
         "Keep bystanders away from fallen powerlines."
        ]
       ],
       [
        [
         0,
         "First Responder / Emergency Response Team / Supervisor"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "electric",
   "icon": "zap"
  },
  {
   "title": "FALL FROM HEIGHT",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "If a person is suspended mid-air:"
        ],
        [
         1,
         "If person suspended in a fall arrest harness is conscious, instruct them to use the 'trauma straps' on their harness;"
        ],
        [
         1,
         "If the fall has occurred from mobile plant e.g. EWP, use the emergency lowering device; this may be in the form of a lowering device, bleed valve or an electronic over-ride running an auxiliary hydraulic pump, to carefully lower the work platform to an area where the fallen worker can be safely grounded."
        ],
        [
         1,
         "If unable to lower the person, use another/secondary item of suitable equipment or plant e.g., EWP, Scissor lift, Platform ladder, to stabilise the suspended person:"
        ],
        [
         1,
         "Coordinate rescue (with trained and competent persons) to ensure that individual is not suspended for >10 minutes;"
        ],
        [
         2,
         "Ensure PEV is fit for purpose;"
        ],
        [
         2,
         "Ensure operators are trained and follow safety protocols;"
        ],
        [
         2,
         "If the suspended person cannot be safely and immediately rescued, encourage the conscious worker to use suspension relief straps and keep moving their legs; and"
        ],
        [
         2,
         "Use an Emergency Descent Device (EDD) to lower casualty to the ground:"
        ],
        [
         1,
         "Visually check the casualty to ensure further injury / danger is minimised, provide verbal reassurance;"
        ],
        [
         1,
         "Raise the rescue kit;"
        ],
        [
         1,
         "Attach the rescue kit sling to a suitable attachment point;"
        ],
        [
         1,
         "Attach the personal rescue device to yourself;"
        ],
        [
         1,
         "Attach rescue kit EDD to the rescue rope, test the functionality of the EDD;"
        ],
        [
         1,
         "Attach yourself to the EDD and lock off EDD;"
        ],
        [
         1,
         "Detach yourself from the structure;"
        ],
        [
         1,
         "Descend to casualty and lock off EDD;"
        ],
        [
         1,
         "Attach the personal rescue device to the rescue rope and to the casualty;"
        ],
        [
         1,
         "Raise the casualty to take the weight off his attachment;"
        ],
        [
         1,
         "Secure casualty's harness to rescuers;"
        ],
        [
         1,
         "Slowly release the personal rescue device to transfer the full weight of the casualty to the rescuer;"
        ],
        [
         1,
         "Lower the casualty to the ground;"
        ],
        [
         1,
         "Disconnect self / casualty from the rescue rope; and"
        ],
        [
         1,
         "Move the casualty to a suitable location to allow first aid to be administered and seek medical assistance."
        ],
        [
         1,
         "Once on the ground, lay the casualty flat as soon as it is safe to do so, follow DRSABCD and call 000. Do not keep the casualty sitting or semi-recumbent (ANZCOR Guideline 9.1.5)."
        ]
       ],
       [
        [
         0,
         "First Responder & Emergency Response Team"
        ]
       ]
      ],
      [
       [
        [
         0,
         "If person has fallen to the ground:"
        ],
        [
         1,
         "Follow DRSABCD (refer Medical Emergency card)."
        ]
       ],
       [
        [
         0,
         "First Responder & Emergency Response Team"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "fall",
   "icon": "down"
  },
  {
   "title": "ELEVATED WORK PLATFORM (EWP) FAILURE / RESCUE",
   "sub": "",
   "tables": [
    {
     "head": [
      "SCENARIO",
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Mechanically Faulty EWP (Stuck mid-air)"
        ]
       ],
       [
        [
         0,
         "When the use of motor or battery powered ground controls will not work:"
        ],
        [
         1,
         "As detailed in the EWP Rescue Plan;"
        ],
        [
         1,
         "Spotter to attempt to use ground controls to lower basket. If unsuccessful;"
        ],
        [
         1,
         "Try to bleed down boom using emergency / auxiliary pump. If unsuccessful;"
        ],
        [
         1,
         "Deploy a second EWP to retrieve the worker, if possible;"
        ],
        [
         2,
         "A transfer of lanyards to the second EWP will be required, before worker can safely climb over into the bucket. If unsuccessful;"
        ],
        [
         1,
         "Use of an EDD system to descend to the ground safely."
        ]
       ],
       [
        [
         0,
         "Supervisor / Qualified Operator / IP"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Scissor / Vertical Lift – Platform Will Not Lower"
        ]
       ],
       [
        [
         0,
         "Refer to the task Scissor Lift Rescue Plan (TEM-SHEQ-GNP-0018):"
        ],
        [
         1,
         "Operator attempts to lower using the platform controls; check E-stops and battery isolation;"
        ],
        [
         1,
         "Spotter lowers the platform using the ground controls. If unsuccessful;"
        ],
        [
         1,
         "Spotter operates the OEM emergency (manual) lowering valve per the manufacturer's decal / operator manual;"
        ],
        [
         1,
         "Operator remains inside the guardrails — never climb down the scissor stack or guardrails;"
        ],
        [
         1,
         "If the platform still cannot be lowered, retrieve the operator using a second EWP or platform ladder where safe, as directed by the Chief Warden, maintaining fall protection during transfer;"
        ],
        [
         1,
         "Medical emergency on the platform: lower immediately using the above sequence, call 000 and follow DRSABCD once grounded."
        ]
       ],
       [
        [
         0,
         "Operator / Spotter / Supervisor / Chief Warden"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Mechanical Damage (Stuck equipment)"
        ]
       ],
       [
        [
         0,
         "The worker has struck the EWP against equipment/structure & is not confident that EWP will return them safely to ground:"
        ],
        [
         1,
         "Deploy a second EWP to retrieve the worker, if possible;"
        ],
        [
         2,
         "A transfer of lanyards to the second EWP will be required, before worker can safely climb over into the bucket. If unsuccessful;"
        ],
        [
         1,
         "Use of an EDD system to descend to the ground safely."
        ]
       ],
       [
        [
         0,
         "Supervisor / Qualified Operator / IP"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Electrical Fault"
        ]
       ],
       [
        [
         0,
         "EWP bucket controls are non-responsive/not functioning correctly e.g. EWP left slewing rather than right etc:"
        ],
        [
         1,
         "Spotter to attempt to use ground controls to lower basket. If unsuccessful;"
        ],
        [
         1,
         "Try to bleed down boom using emergency / auxiliary pump. If unsuccessful;"
        ],
        [
         1,
         "Deploy a second EWP to retrieve the worker, if possible; and"
        ],
        [
         2,
         "A transfer of lanyards to the second EWP will be required, before worker can safely climb over into the bucket. If unsuccessful;"
        ],
        [
         1,
         "Use of an EDD system to descend to the ground safely."
        ]
       ],
       [
        [
         0,
         "Supervisor / Qualified Operator / IP"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Motor Failure"
        ]
       ],
       [
        [
         0,
         "EWP motor ceases to function (unknown reason):"
        ],
        [
         1,
         "Check all E-Stops on the EWP;"
        ],
        [
         1,
         "Attempt to restart the EWP via the controller and/or truck and ensure PTO is engaged. If basket controller does not work;"
        ],
        [
         1,
         "Spotter to attempt to use ground controls to lower basket. If unsuccessful;"
        ],
        [
         1,
         "Try to bleed down boom using emergency / auxiliary pump. If unsuccessful;"
        ],
        [
         1,
         "The use of second EWP to gather the worker stuck if possible; and"
        ],
        [
         2,
         "A transfer of lanyards to the 2nd EWP before safely climbing over into the bucket. If unsuccessful;"
        ],
        [
         1,
         "Use of an EDD system to descend to the ground safely."
        ]
       ],
       [
        [
         0,
         "Supervisor / Qualified Operator / IP"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Injured Worker"
        ]
       ],
       [
        [
         1,
         "Responsive:"
        ],
        [
         2,
         "Question the worker whether they are comfortable and able to let themselves down to the ground via bucket controls, if unable."
        ],
        [
         2,
         "The spotter will use ground controls to return the injured worker to the ground safely."
        ],
        [
         1,
         "Unresponsive:"
        ],
        [
         2,
         "Question the worker whether they are comfortable and able to let themselves down to the ground via the bucket controls, if no response;"
        ],
        [
         2,
         "The spotter will use the ground controls to return the injured worker to the ground safely; and"
        ],
        [
         2,
         "Call the relevant emergency services."
        ],
        [
         1,
         "Treat injured worker:"
        ],
        [
         2,
         "DRSABCD – treat injury as required;"
        ],
        [
         2,
         "Contact Emergency Response Team / Emergency Services;"
        ],
        [
         2,
         "Ask the individual to keep still & provide reassurance; and"
        ],
        [
         2,
         "Stay with the individual until medical aid arrives."
        ]
       ],
       [
        [
         0,
         "Supervisor / Qualified Operator / IP / First Responder / Emergency Response Team"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "ewp",
   "icon": "layers"
  },
  {
   "title": "UTILITY / SERVICE STRIKE",
   "sub": "",
   "tables": [
    {
     "head": [
      "UTILITY",
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Gas"
        ]
       ],
       [
        [
         1,
         "Isolate the gas supply, if safe to do so;"
        ],
        [
         1,
         "Leave the area;"
        ],
        [
         1,
         "Keep people clear of the area;"
        ],
        [
         1,
         "Allow gas to vent into the air;"
        ],
        [
         1,
         "Eliminate ignition sources (i.e. no smoking or naked flames);"
        ],
        [
         1,
         "Do not use any devices that may be an ignition source (including vehicle engines, power tools and mobile phones);"
        ],
        [
         1,
         "Where safe to do so, shut off all machinery, vehicles, tools, and equipment in the area;"
        ],
        [
         1,
         "Once clear of the area, immediately contact the gas utility company;"
        ],
        [
         1,
         "Do not attempt to stop the flow of gas or repair the gas infrastructure."
        ]
       ],
       [
        [
         0,
         "First Responder"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Power (overhead or underground)"
        ]
       ],
       [
        [
         1,
         "Turn off vehicle / plant and try to stay calm;"
        ],
        [
         1,
         "Advise personnel and bystanders clear – at least 8m away from impacted network assets;"
        ],
        [
         1,
         "If it is safe to do so, whilst in the vehicle, call 000 and Western Power (13 13 51);"
        ],
        [
         1,
         "STAY IN THE VEHICLE / PLANT unless it is unsafe to do so due to fire or other life-threatening circumstances;"
        ],
        [
         1,
         "If you are forced to evacuate, jump clear of the vehicle, landing with both feet together. Do not touch the ground and the vehicle at the same time as this may create a path for electricity to flow to earth through your body, which could electrocute you;"
        ],
        [
         1,
         "Slowly shuffle at least 8m away, do not run or lift your feet;"
        ],
        [
         1,
         "Wait for utility/service owner to attend to make the area safe;"
        ],
        [
         1,
         "Quarantine the vehicle for 24 hours – contact fleet team to have the tyres examined prior to re-use;"
        ],
        [
         1,
         "Any instances of electric shock require medical evaluation."
        ]
       ],
       [
        [
         0,
         "First Responder"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Water"
        ]
       ],
       [
        [
         1,
         "Call 000 if there is a life-threatening situation;"
        ],
        [
         1,
         "Call the water utility company;"
        ],
        [
         1,
         "Isolate the water supply, if safe to do so;"
        ],
        [
         1,
         "Leave the area;"
        ],
        [
         1,
         "Keep people clear of the area."
        ]
       ],
       [
        [
         0,
         "First Responder"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "utility",
   "icon": "zap"
  },
  {
   "title": "SPILLS — HYDROCARBON / OIL",
   "sub": "",
   "tables": [
    {
     "head": [
      "STEP",
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Communicate the Hazard"
        ]
       ],
       [
        [
         1,
         "Raise the alarm;"
        ],
        [
         1,
         "Identify the product;"
        ],
        [
         1,
         "Notify others in the area and Supervisor;"
        ],
        [
         1,
         "Evacuate area, if required;"
        ],
        [
         1,
         "Call emergency services (fire & rescue) if required;"
        ],
        [
         1,
         "Coordinate a person to wait at site entrance to guide emergency services in if required;"
        ],
        [
         1,
         "Ensure any injured or contaminated persons are removed from the immediate area and taken to a safe place."
        ]
       ],
       [
        [
         0,
         "First Responder / Supervisor"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Control the Spill"
        ]
       ],
       [
        [
         1,
         "Retrieve the nearest hydrocarbon spill kit;"
        ],
        [
         1,
         "Put on the personal protective equipment (PPE) identified on the spill kit instruction card and the product Safety Data Sheet, as a minimum, chemical-resistant gloves and safety glasses — before attempting to contain the spill locally;"
        ],
        [
         1,
         "Do not attempt containment without appropriate PPE;"
        ],
        [
         1,
         "Turn off power to any machinery or equipment causing a spill or leak as soon as it is detected:"
        ],
        [
         1,
         "Turn off supply taps from source (e.g. hydraulic / fuel tanks of vehicles or machinery);"
        ],
        [
         1,
         "Isolate the vehicles or machinery as required."
        ]
       ],
       [
        [
         0,
         "First Responder / Supervisor"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Contain the Hazard"
        ]
       ],
       [
        [
         1,
         "Utilise the contents of the hydrocarbon spill kit (follow included instruction card);"
        ],
        [
         1,
         "Use absorbent matting or kitty litter to soak up hydrocarbons and prevent contamination from spreading;"
        ],
        [
         1,
         "If practical, build an earth wall around the spill to prevent further contamination;"
        ],
        [
         1,
         "Move the source of the spill away from any nearby water bodies where possible and safe to do so. Cover stormwater drains if any nearby;"
        ],
        [
         1,
         "If the spill is too large to contain contact emergency services."
        ]
       ],
       [
        [
         0,
         "First Responder"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Clean Up the Spill"
        ]
       ],
       [
        [
         1,
         "Place soaked matting, kitty litter and contaminated soil into suitable bags or containers and seal;"
        ],
        [
         1,
         "Ensure all traces of contamination are cleaned up;"
        ],
        [
         1,
         "Never leave containers used for the clean-up of containment exposed to the elements (i.e. rain), ensure all containers are drained and any remnants of the spill removed, and containers stored correctly;"
        ],
        [
         1,
         "If the spill is very large, earth moving equipment may be required to assist with the clean-up (consult your Supervisor if this is the case)."
        ]
       ],
       [
        [
         0,
         "First Responder"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Disposal"
        ]
       ],
       [
        [
         1,
         "Place hydrocarbon contaminated waste in a dedicated bin;"
        ],
        [
         1,
         "Arrange approved disposal (contact SHE Advisor for guidance)."
        ],
        [
         1,
         "Record the spill in MYOSH and notify in accordance with Section 12;"
        ],
        [
         1,
         "Where the spill causes, or is likely to cause, pollution, the SHE Manager notifies DWER as soon as practicable (Environmental Protection Act 1986 s.72)."
        ]
       ],
       [
        [
         0,
         "Supervisor"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "spill",
   "icon": "drop"
  },
  {
   "title": "TRAFFIC MANAGEMENT INCIDENT",
   "sub": "(Worker / Pedestrian Struck by Vehicle)",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Establish detours to by-pass the incident area & promote driver behaviour to avoid the incident area;"
        ],
        [
         1,
         "Assess damage/injury;"
        ],
        [
         1,
         "Use traffic management to stop/divert traffic, to isolate the injured person(s) from further hazards;"
        ],
        [
         1,
         "Follow DRSABCD:"
        ],
        [
         2,
         "Danger: Check for danger & ensure the area is safe for yourself, bystanders, and the individual;"
        ],
        [
         2,
         "Response: Check for a response from the individual;"
        ],
        [
         2,
         "Send for Help: Call Triple Zero (000) or send someone to call. If you must leave an unconscious, breathing casualty to call for help, first place them in the recovery position;"
        ],
        [
         2,
         "Airways: Open the individual's mouth and check for foreign material;"
        ],
        [
         2,
         "Breathing: Check for breathing: Look, listen and feel for 10 seconds;"
        ],
        [
         2,
         "CPR: 30 chest compressions, followed by 2 breaths. Continue until help arrives, individual starts breathing, or you are physically unable to continue; and"
        ],
        [
         1,
         "Administer first aid to treat injuries (within competency abilities);"
        ],
        [
         2,
         "If there is more than one casualty prioritise who is most critical."
        ],
        [
         1,
         "Call emergency services (if required); and"
        ],
        [
         2,
         "Nominate a team member/bystander to wait at entrance/road etc. to guide emergency services to site."
        ],
        [
         1,
         "Traffic control to hold or open access so that emergency services can reach the injured person on arrival."
        ]
       ],
       [
        [
         0,
         "Traffic Management / First Responder / Emergency Response Team"
        ]
       ]
      ],
      [
       [
        [
         1,
         "If emergency services are not required, the Supervisor arranges transport of the stabilised person, accompanied by a first aider, to nominated medical facility for assessment;"
        ],
        [
         1,
         "The driver / operator involved is subject to post-incident drug and alcohol testing in accordance with the WHSMP."
        ]
       ],
       [
        [
         0,
         "Supervisor / Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Fire:"
        ],
        [
         1,
         "Switch off vehicle ignition;"
        ],
        [
         1,
         "Stop anyone from smoking nearby; and"
        ],
        [
         1,
         "If there is a fire under the bonnet of the vehicle, use a fire extinguisher – release the bonnet latch, do not open fully – aim extinguisher through the gap."
        ]
       ],
       [
        [
         0,
         "Emergency Response Team / Supervisor"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "traffic",
   "icon": "truck"
  },
  {
   "title": "MISSING PERSON",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Confirm that the reported person/s is/are missing."
        ]
       ],
       [
        [
         0,
         "Supervisor"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Notify Construction Manager and make attempts to contact the person."
        ]
       ],
       [
        [
         0,
         "Supervisor"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Review the journey management plan to determine possible locations."
        ]
       ],
       [
        [
         0,
         "Supervisor / Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Liaise with departure site and destination site for thorough search."
        ]
       ],
       [
        [
         0,
         "Supervisor / Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Make attempts to locate through other parties (e.g., another field crew)."
        ]
       ],
       [
        [
         0,
         "Supervisor / Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Identify and brainstorm possibilities."
        ]
       ],
       [
        [
         0,
         "All Team Members"
        ]
       ]
      ],
      [
       [
        [
         1,
         "If the missing person cannot be located within 30 minutes of the specified check-in time, notify the Project Director and enact the emergency response."
        ]
       ],
       [
        [
         0,
         "Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Liaise with HR about notifying Emergency Contact prior to police notification. Avoid speculation with family but engage their insights into possibilities."
        ]
       ],
       [
        [
         0,
         "Project Director"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Notify WA Police (the search and rescue authority) on 000. Provide all available information to the search party."
        ]
       ],
       [
        [
         0,
         "Project Director"
        ]
       ]
      ],
      [
       [
        [
         1,
         "If it is safe to do so, launch / coordinate an infield search but ensure that no less than two people are engaged together, and regular communications are instigated with all involved parties."
        ]
       ],
       [
        [
         0,
         "Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Search teams should carry appropriate first aid equipment and water."
        ]
       ],
       [
        [
         0,
         "Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Notify customer / stakeholders as appropriate."
        ]
       ],
       [
        [
         0,
         "Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Ensure support and counselling are effective and in place for the family."
        ]
       ],
       [
        [
         0,
         "Project Director"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Notify all search parties when the missing person is located."
        ]
       ],
       [
        [
         0,
         "Supervisor"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "missing",
   "icon": "search"
  },
  {
   "title": "BOMB / SUBSTANCE THREAT",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Any person who receives a bomb / substance threat must remain calm and do the following."
        ],
        [
         1,
         "Ask the following questions:"
        ],
        [
         2,
         "Where did you put the bomb/substance?"
        ],
        [
         2,
         "When is it going to explode?"
        ],
        [
         2,
         "When did you put it there?"
        ],
        [
         2,
         "What does the bomb/substance look like?"
        ],
        [
         2,
         "What kind of bomb/substance is it?"
        ],
        [
         2,
         "What will make it explode?"
        ],
        [
         2,
         "Did you place the bomb/substance?"
        ],
        [
         2,
         "Why did you place the bomb/substance?"
        ],
        [
         2,
         "Is the substance a liquid, powder, or gas?"
        ],
        [
         2,
         "What is your name?"
        ],
        [
         2,
         "Where are you now?"
        ],
        [
         2,
         "What is your address?"
        ],
        [
         1,
         "Try to record the exact wording of the threat;"
        ],
        [
         1,
         "Call Triple Zero (000) and request Police assistance;"
        ],
        [
         1,
         "Notify the nominated Warden and your Supervisor/Construction Manager (do this discretely to avoid panic)."
        ]
       ],
       [
        [
         0,
         "Worker Receiving Threat / Emergency Response Team / Project Management"
        ]
       ]
      ],
      [
       [
        [
         0,
         "If a suspected bomb/substance you must take the following steps:"
        ],
        [
         1,
         "Do not touch it;"
        ],
        [
         1,
         "Clear the area; and"
        ],
        [
         1,
         "Prevent any other person from touching or entering the vicinity of the exposed area near the bomb/substance."
        ]
       ],
       [
        [
         0,
         "Emergency Response Team / Project Management"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Note:"
        ],
        [
         1,
         "Bomb threats may require a different response to other emergencies. For example, if it is thought a bomb is located in or near the assembly area, evacuation to a different area or no evacuation at all may be ordered."
        ]
       ],
       [
        [
         0,
         "—"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "bomb",
   "icon": "alert"
  },
  {
   "title": "EXTERNAL EMERGENCY",
   "sub": "(Flood, Lightning, Storm, Earthquake, or Other Emergency Event)",
   "tables": [
    {
     "head": [
      "PHASE",
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Preparation"
        ]
       ],
       [
        [
         1,
         "Monitor Bureau of Meteorology (BoM) website and DFES emergency advisories daily — increase frequency during forecast severe weather events. Where a severe weather event is forecast or imminent:"
        ],
        [
         2,
         "Issue alerts via UHF, SMS and email to ensure all personnel are informed."
        ],
        [
         2,
         "Review worker movements and recall personnel from remote workfronts; suspend further travel."
        ],
        [
         2,
         "Implement cessation triggers per Section 10.2 Inclement Weather Triggers (lightning, wind, rainfall, visibility, temperature)."
        ],
        [
         2,
         "Confirm communication arrangements — UHF, Starlink, mobile, and backup satellite phone per Communication Failure Protocol."
        ],
        [
         2,
         "Confirm food, water and accommodation arrangements for any personnel unable to demobilise."
        ],
        [
         2,
         "Conduct a detailed site clean-up: secure loose materials, lay-down items, signage, scaffolding ties, formwork; secure or relocate combustible materials."
        ],
        [
         2,
         "Locate and audit emergency kits (first aid, spill, rescue) — replenish as required."
        ],
        [
         2,
         "Turn off non-essential electrical appliances and gas supply valves; isolate where practicable."
        ],
        [
         2,
         "When preparations are complete, management directs workers to demobilise to accommodation or designated safe location."
        ],
        [
         2,
         "Monitor UHF radio for ongoing instructions — note mobile phone networks may fail during severe weather events."
        ]
       ],
       [
        [
         0,
         "Construction Manager / Emergency Response Team / SHE Advisor"
        ]
       ]
      ],
      [
       [
        [
         0,
         "During Emergency Event"
        ]
       ],
       [
        [
         1,
         "Contact nominated Warden;"
        ],
        [
         1,
         "Order the evacuation of affected areas;"
        ],
        [
         1,
         "Ensure personnel are moved to safe assembly points;"
        ],
        [
         1,
         "Activate alarms and communication systems;"
        ],
        [
         1,
         "Contact Emergency Services as listed on Appendix A – Emergency Contacts;"
        ],
        [
         2,
         "When contacting the emergency services, state the following: Your name; Company name; Address of incident and site address and Plus Code M83P+PRV; Types of injuries (if any); and any other relevant information."
        ],
        [
         1,
         "Stay in contact with emergency until told otherwise."
        ],
        [
         1,
         "Note: When the event occurs outside normal working hours the nominated Warden or their delegate should attempt to visit the site to isolate any power, water or gas source and provide access to emergency services where required."
        ]
       ],
       [
        [
         0,
         "Emergency Response Team / Supervisor"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Post Emergency Event"
        ]
       ],
       [
        [
         1,
         "After all clear is given by the emergency services and/or the nominated Warden. Nominated Warden in conjunction with management will:"
        ],
        [
         2,
         "Debrief workers;"
        ],
        [
         2,
         "Ensure a controlled and orderly approach to returning to work;"
        ],
        [
         2,
         "Identify any damaged areas and ensure they are barricaded and or locked until repairs are completed; and"
        ],
        [
         2,
         "Ensure preservation of site and evidence and provide cooperation with internal and statutory investigations (if relevant)."
        ]
       ],
       [
        [
         0,
         "Emergency Response Team / Project Management / SHEQ"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "external",
   "icon": "cloud"
  },
  {
   "title": "COMMUNICATIONS FAILURE",
   "sub": "External emergency – Communications Failure Protocol",
   "tables": [
    {
     "head": [
      "PHASE",
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Preparation"
        ]
       ],
       [
        [
         1,
         "Complete a UHF radio communications check at every daily pre-start; record completion in the pre-start record;"
        ],
        [
         1,
         "Complete a communications check before any remote, isolated or working-alone task commences — no comms check, no task start;"
        ],
        [
         1,
         "Maintain the communications hierarchy in the following order of precedence:"
        ],
        [
         2,
         "UHF radio for all field communications;"
        ],
        [
         2,
         "Starlink internet/VoIP at the site office;"
        ],
        [
         2,
         "mobile phone where coverage permits;"
        ],
        [
         2,
         "satellite phone held at the site office / by the Chief Warden as backup of last resort;"
        ],
        [
         1,
         "Inspect communication equipment (UHF radios, Starlink, satellite phone) monthly per Table 12 and report defects immediately; and"
        ],
        [
         1,
         "Display the site UHF channel and emergency contact methods on the Emergency Response Board."
        ]
       ],
       [
        [
         0,
         "Supervisor / SHE Advisor / All Workers"
        ]
       ]
      ],
      [
       [
        [
         0,
         "On Identifying a Communication Failure"
        ]
       ],
       [
        [
         1,
         "Attempt contact via the next available method in the order of precedence;"
        ],
        [
         1,
         "Notify the Supervisor and Chief Warden of the failure by the fastest available means (including physically returning to the site office if no method is available);"
        ],
        [
         1,
         "CEASE all work dependent on communications availability — working alone, remote workfronts, rescue standby and permit-controlled HRCW — until communications are restored;"
        ],
        [
         1,
         "Affected personnel return to, or remain at, their designated muster/contact point;"
        ],
        [
         1,
         "Supervisor conducts a headcount and accounts for all personnel against the visitor register and sign-on records (refer Section 8.2); and"
        ],
        [
         1,
         "Implement a scheduled check-in regime at maximum 30-minute intervals using the best available method (including physical runner between workfronts where no other method exists)."
        ]
       ],
       [
        [
         0,
         "First Responder / Supervisor / Chief Warden"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Missed Check-In"
        ]
       ],
       [
        [
         1,
         "Treat any missed scheduled check-in as a potential emergency;"
        ],
        [
         1,
         "Immediately initiate the MISSING PERSON response (this Appendix); and"
        ],
        [
         1,
         "Notify the Construction Manager."
        ]
       ],
       [
        [
         0,
         "Supervisor / Construction Manager"
        ]
       ]
      ],
      [
       [
        [
         0,
         "During an Emergency with Failed Communications"
        ]
       ],
       [
        [
         1,
         "Dispatch a vehicle to the nearest point of reliable mobile coverage or to the nearest occupied premises to contact 000;"
        ],
        [
         1,
         "Provide the site address as per Section 8.3: Yerramullah Terminal (YMT) construction site, Cowalla Road, Hill River WA 6521 — approx. 15 km from the Brand Highway turnoff via Cowalla Road; Plus Code M83P+PRV; GPS 30.3456° S, 115.3370° E; Shire of Dandaragan; and"
        ],
        [
         1,
         "Dispatch the escort vehicle to the primary site entry to meet Emergency Services per Section 8.3."
        ]
       ],
       [
        [
         0,
         "Chief Warden / Supervisor"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Restoration"
        ]
       ],
       [
        [
         1,
         "Chief Warden confirms and verifies communications are restored across all required methods;"
        ],
        [
         1,
         "Conduct a roll-call confirming all personnel accounted for;"
        ],
        [
         1,
         "Authorise recommencement of comms-dependent work — no affected work recommences without Chief Warden verification;"
        ],
        [
         1,
         "Record the failure event, duration, cause and response in MYOSH; and"
        ],
        [
         1,
         "Report repeated or prolonged failures to the SHE Manager for review of communication arrangements and this protocol."
        ]
       ],
       [
        [
         0,
         "Chief Warden / Supervisor / SHE Advisor"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "comms",
   "icon": "radio"
  },
  {
   "title": "CIVIL DISTURBANCE / PERSONAL THREAT",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Notify the Construction Manager immediately;"
        ],
        [
         1,
         "Call Triple Zero (000) where there is any threat to safety and request Police assistance (131 444 for non-urgent reports only);"
        ],
        [
         1,
         "Do not say or do anything that may encourage irrational behaviour;"
        ],
        [
         1,
         "Remove any objects, plant and equipment in accessible locations that may be used as weapons or missiles by aggressive trespassers;"
        ],
        [
         1,
         "Alert other personnel in the vicinity of the threat; and"
        ],
        [
         1,
         "Evacuate if safe to do so."
        ]
       ],
       [
        [
         0,
         "Emergency Response Team / Project Management"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "civil",
   "icon": "shield"
  },
  {
   "title": "VEHICLE COLLISION (PUBLIC ROAD / DAILY COMMUTE)",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Stop only where safe; switch on hazard lights, apply the park brake and switch off the ignition;"
        ],
        [
         1,
         "Wear hi-vis before exiting; place warning triangles; keep all passengers clear of live traffic lanes;"
        ],
        [
         1,
         "Call Triple Zero (000): state the road name (e.g. Brand Highway, Cowalla Road), direction of travel, nearest intersection or landmark, number of vehicles and casualties, and any hazards (fuel leak, fire, livestock / fauna on road);"
        ],
        [
         1,
         "Follow DRSABCD; do not move casualties unless there is immediate danger (fire, traffic);"
        ],
        [
         1,
         "With multiple casualties, prioritise those who are unresponsive or not breathing normally;"
        ],
        [
         1,
         "Account for every occupant against the vehicle / mini-bus passenger list;"
        ],
        [
         1,
         "If there is no mobile coverage, send a vehicle to the nearest point of coverage or occupied premises (Communications Failure Protocol)."
        ]
       ],
       [
        [
         0,
         "Driver / First Responder / First Aider"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Notify the Construction Manager and SHE Manager immediately; notify the Principal in accordance with Section 12;"
        ],
        [
         1,
         "Arrange recovery of uninjured personnel to site or accommodation;"
        ],
        [
         1,
         "Preserve the scene for WA Police; do not move vehicles unless directed by Police or required for safety;"
        ],
        [
         1,
         "Post-incident drug and alcohol testing for the driver in accordance with the WHSMP;"
        ],
        [
         1,
         "Fauna or livestock strike: report as an environmental incident in accordance with the WHSMP, and notify the Land Access Coordinator where livestock or private property is involved."
        ]
       ],
       [
        [
         0,
         "Supervisor / Construction Manager / SHE Manager /  Land Access Coordinator (the role held by the Environmental Supervisor (Environmental Lead)."
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "vehicle",
   "icon": "truck"
  },
  {
   "title": "HEAT ILLNESS",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         1,
         "Move the person out of the heat to a shaded or air-conditioned area (site office or vehicle cool zone);"
        ],
        [
         1,
         "Call the First Aider and Supervisor;"
        ],
        [
         1,
         "Signs of heat stroke (confusion, slurred speech, collapse, seizure, hot skin, or not sweating): call Triple Zero (000) immediately;"
        ],
        [
         1,
         "Follow DRSABCD if the person is unresponsive;"
        ],
        [
         1,
         "Cool the person rapidly: remove excess clothing and PPE, wet the skin with cool water and fan continuously, and apply cold packs to the neck, armpits and groin; use cold water immersion where available;"
        ],
        [
         1,
         "If fully conscious and able to swallow, give small sips of cool water; do not give fluids to a person with an altered conscious state;"
        ],
        [
         1,
         "Stay with the person and continue cooling until the ambulance arrives or symptoms resolve;"
        ],
        [
         1,
         "A worker treated for heat illness does not return to work that shift and requires medical assessment."
        ]
       ],
       [
        [
         0,
         "First Responder / First Aider"
        ]
       ]
      ],
      [
       [
        [
         1,
         "Review work–rest cycles, hydration and heat triggers for the remaining crew (Section 10.2.5, TEM-SHEQ-GNP-0055);"
        ],
        [
         1,
         "Record the event in MYOSH and notify in accordance with Section 12."
        ]
       ],
       [
        [
         0,
         "Supervisor / SHE Advisor"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "heat",
   "icon": "sun"
  },
  {
   "title": "STRUCTURAL FAILURE / COLLAPSE",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Immediate response"
        ],
        [
         1,
         "Raise the alarm on UHF channel 24: “Emergency, Emergency, Emergency” – state the location, the structure involved and the number of people affected."
        ],
        [
         1,
         "Stop all work and plant movement in the area. Do not approach an unstable structure, formwork or excavation."
        ],
        [
         1,
         "Set up an exclusion zone of at least 1.5 times the height of the structure, or as directed by the Chief Warden, and prevent entry."
        ],
        [
         1,
         "Call 000 if anyone is trapped or injured, and state that the incident is a structural collapse."
        ],
        [
         1,
         "Isolate energy sources to the structure (electrical, hydraulic, stored energy) where it is safe to do so."
        ]
       ],
       [
        [
         0,
         "First Responder / Supervisor"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Rescue and casualty care"
        ],
        [
         1,
         "Do not attempt to lift or dig out a trapped person until a competent person has confirmed the structure is stable; where it remains unstable, wait for DFES."
        ],
        [
         1,
         "Where a casualty can be reached safely, apply DRSABCD (Appendix D) and follow the 000 operator’s directions for crush injury."
        ],
        [
         1,
         "Account for all personnel at the muster point and report anyone missing to the Chief Warden and emergency services."
        ],
        [
         1,
         "Meet emergency services at the YMT Primary Site Entry (Section 8.3) and brief them on the structure, hazards and casualties."
        ]
       ],
       [
        [
         0,
         "Chief Warden / ERT"
        ]
       ]
      ],
      [
       [
        [
         0,
         "After the event"
        ],
        [
         1,
         "Preserve the scene; do not disturb the structure or failed components except to rescue or make safe (WHS Act s.39)."
        ],
        [
         1,
         "Notify the Principal and the regulator in accordance with Section 12. A collapse of a structure, excavation or shoring may be a notifiable dangerous incident (WHS Act s.37)."
        ],
        [
         1,
         "A competent engineer (Design Manager / Partum) assesses stability before any recovery or re-entry."
        ]
       ],
       [
        [
         0,
         "Construction Manager / SHE Manager"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "structural",
   "icon": "layers"
  },
  {
   "title": "CRANE / LIFTING INCIDENT",
   "sub": "",
   "tables": [
    {
     "head": [
      "ACTION",
      "RESPONSIBLE"
     ],
     "rows": [
      [
       [
        [
         0,
         "Immediate response"
        ],
        [
         1,
         "Stop the lift. If a suspended load is stable, hold it where it is; move the crane only if needed to make the situation safe."
        ],
        [
         1,
         "Raise the alarm on UHF channel 24 and clear everyone from under the load and from the crane’s fall zone."
        ],
        [
         1,
         "If the crane, load or rigging has contacted or come close to an overhead line or energised apparatus, keep everyone clear, follow the Electrocution / Electric Shock card (Fallen Power Lines) and notify Western Power immediately."
        ],
        [
         1,
         "Call 000 if anyone is injured or trapped."
        ]
       ],
       [
        [
         0,
         "Crane Operator / Dogman / Supervisor"
        ]
       ]
      ],
      [
       [
        [
         0,
         "Casualty care and securing the site"
        ],
        [
         1,
         "Do not go under a suspended or unstable load to reach a casualty; lower or secure the load first, under the direction of the crane operator and a competent rigger, where it is safe to do so."
        ],
        [
         1,
         "Apply DRSABCD (Appendix D)."
        ],
        [
         1,
         "Where a crane is unstable or has overturned, do not attempt recovery; isolate the area and obtain a recovery plan from the crane supplier and a competent person."
        ],
        [
         1,
         "Meet emergency services at the YMT Primary Site Entry."
        ]
       ],
       [
        [
         0,
         "Chief Warden / ERT"
        ]
       ]
      ],
      [
       [
        [
         0,
         "After the event"
        ],
        [
         1,
         "Preserve the scene and all rigging; quarantine and tag out the lifting equipment involved."
        ],
        [
         1,
         "Notify the Principal and the regulator in accordance with Section 12. Collapse, overturning or failure of a crane, or the fall of a load from height, may be a notifiable dangerous incident (WHS Act s.37)."
        ],
        [
         1,
         "Crane recovery and resumption of lifting only under an approved lift plan (FRM-SHEQ-GNP-0047 Critical Lift Plan)."
        ]
       ],
       [
        [
         0,
         "Construction Manager / SHE Manager"
        ]
       ]
      ]
     ]
    }
   ],
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix B Rev 1 | 25/09/2026",
   "id": "crane",
   "icon": "alert"
  },
  {
   "title": "DRSABCD",
   "sub": "Action plan",
   "tables": [],
   "id": "drsabcd",
   "icon": "heart",
   "image": "assets/emergency/drsabcd.jpg",
   "source": "J1084-HSE-PLN-YMT-0002 – Emergency Response Plan, Appendix D Rev 1 | 25/09/2026"
  }
 ],
 "contacts": [
  {
   "group": "Police, fire and ambulance",
   "items": [
    {
     "name": "Emergency – Police, Fire, Ambulance",
     "phone": "000",
     "detail": "Life-threatening emergencies. Free call.",
     "hl": true
    },
    {
     "name": "Police Switchboard (non-emergency)",
     "phone": "131 444",
     "detail": ""
    },
    {
     "name": "SES Emergency Assistance",
     "phone": "132 500",
     "detail": ""
    },
    {
     "name": "DFES Emergency Information Line",
     "phone": "13 33 37",
     "detail": ""
    },
    {
     "name": "DFES Total Fire Ban Hotline",
     "phone": "1800 709 355",
     "detail": ""
    },
    {
     "name": "Emergency WA – bushfire alerts and warnings",
     "url": "https://www.emergency.wa.gov.au",
     "detail": "Check daily; advise Chief Warden of any alert at Watch and Act or above"
    },
    {
     "name": "St John Ambulance (Office Hours: Mon–Fri 8.30am–4.30pm)",
     "phone": "9334 1222",
     "detail": ""
    }
   ]
  },
  {
   "group": "Hospitals",
   "note": "Closest 24-hour emergency department: Moora Hospital, 66 Dandaragan Street, Moora WA 6510",
   "items": [
    {
     "name": "Moora Hospital",
     "phone": "(08) 9651 0222",
     "detail": "66 Dandaragan Street, Moora WA 6510 – Nearest 24-hour ED – approx. 40 min drive from YMT",
     "hl": true
    },
    {
     "name": "Joondalup Health Campus",
     "phone": "(08) 9400 9400",
     "detail": "60 Shenton Avenue, Joondalup WA 6027 – Approx. 1 hr 15 min – 1 hr 30 min drive from YMT"
    },
    {
     "name": "Midland Hospital (St John of God)",
     "phone": "(08) 9462 4000",
     "detail": "1 Clayton Street, Midland WA 6056 – Approx. 2 hr drive from YMT"
    },
    {
     "name": "Royal Perth Hospital (State Major Trauma Centre)",
     "phone": "(08) 9224 2244",
     "detail": "197 Wellington Street, Perth WA 6000"
    },
    {
     "name": "St John of God Murdoch Hospital",
     "phone": "(08) 9366 1111",
     "detail": "100 Murdoch Drive, Murdoch WA 6150"
    }
   ]
  },
  {
   "group": "Local contacts – Dandaragan / Moora",
   "items": [
    {
     "name": "Moora Health Centre (Doctor/GP)",
     "phone": "(08) 9651 1433",
     "detail": "Cnr Dandaragan & Kintore St, Moora WA 6510"
    },
    {
     "name": "Moora Health Service (Hospital)",
     "phone": "(08) 9651 0222",
     "detail": "66 Dandaragan Street, Moora"
    },
    {
     "name": "Moora Police Station",
     "phone": "(08) 9653 9400",
     "detail": "Lot 50, Roberts Street, Moora WA 6510"
    }
   ]
  },
  {
   "group": "Regulator and interface",
   "items": [
    {
     "name": "WorkSafe WA – notifiable incidents",
     "phone": "1800 678 198",
     "detail": "Project Director or delegate (WHS Act s.38); preserve site (s.39)"
    },
    {
     "name": "DWER – Pollution Watch",
     "phone": "1300 784 782",
     "detail": "Pollution / discharge notification (EP Act s.72) – SHE Manager"
    },
    {
     "name": "Shire of Dandaragan – Chief Bush Fire Control Officer",
     "phone": "0428 529 110",
     "detail": ""
    },
    {
     "name": "Cervantes accommodation (motel)",
     "phone": "(08) 9652 7145",
     "detail": ""
    }
   ]
  },
  {
   "group": "Local council",
   "items": [
    {
     "name": "Shire of Dandaragan – office",
     "phone": "(08) 9652 0800",
     "detail": ""
    },
    {
     "name": "Shire of Dandaragan – after hours",
     "phone": "0428 114 221",
     "detail": "Emergency Coordinator"
    },
    {
     "name": "Shire of Moora – office",
     "phone": "(08) 9651 0000",
     "detail": ""
    },
    {
     "name": "Shire of Moora – after hours",
     "phone": "0408 511 409",
     "detail": "Ranger / Emergency"
    },
    {
     "name": "Shire of Victoria Plains",
     "phone": "(08) 9628 7004",
     "detail": "After hours diverts to 24/7 service"
    }
   ]
  },
  {
   "group": "Utilities",
   "items": [
    {
     "name": "ATCO Gas",
     "phone": "13 13 52",
     "detail": ""
    },
    {
     "name": "BoM",
     "phone": "1300 659 213",
     "detail": ""
    },
    {
     "name": "DFES",
     "phone": "9395 9300",
     "detail": ""
    },
    {
     "name": "DBCA – Biodiversity, Conservation and Attractions",
     "phone": "9219 9000",
     "detail": ""
    },
    {
     "name": "Main Roads WA",
     "phone": "13 81 38",
     "detail": ""
    },
    {
     "name": "Telstra",
     "phone": "13 22 03",
     "detail": ""
    },
    {
     "name": "Water Corp",
     "phone": "13 13 75",
     "detail": ""
    },
    {
     "name": "Western Power",
     "phone": "13 13 51",
     "detail": ""
    },
    {
     "name": "Western Power Incident Hotline",
     "phone": "1300 225 597",
     "detail": "Network emergencies and work under a WP access permit – also notify the permit issuer"
    },
    {
     "name": "Wildcare Helpline",
     "phone": "9474 9055",
     "detail": ""
    },
    {
     "name": "Wildcare Watch",
     "phone": "1800 449 453",
     "detail": ""
    }
   ]
  },
  {
   "group": "Poisons, wellbeing and support",
   "items": [
    {
     "name": "Poisons Information Call Centre",
     "phone": "13 11 26",
     "detail": ""
    },
    {
     "name": "Employee Assistance Program – Drake WellbeingHub",
     "phone": "1300 135 600",
     "detail": "intake@drakewellbeinghub.com.au"
    },
    {
     "name": "Mates in Construction",
     "phone": "1300 642 111",
     "detail": ""
    },
    {
     "name": "Beyond Blue",
     "phone": "1300 224 636",
     "detail": ""
    }
   ]
  }
 ],
 "tarp": {
  "title": "Adverse Weather and Site Access TARP",
  "doc": "J1084-HSE-TRP-YMT-0001 Rev A",
  "scope": "Trigger Action Response Plan – unsealed road access, Cervantes accommodation to site. Applies to all Genus, contractor and subcontractor personnel.",
  "banner": "NO PERSON TRAVELS TO OR FROM SITE UNTIL AUTHORISED BY GENUS MANAGEMENT. Escalate up a level on any single trigger; only the stated authority may step a level down. Read with J1084-HSE-PRO-YMT-0002 Adverse Weather and Site Access Procedure. Lightning, wind and temperature cessation triggers are at ERMP §10.2 and are not repeated here.",
  "levels": [
   {
    "n": 1,
    "name": "MONITOR",
    "color": "#00A651",
    "triggers": [
     "BOM severe weather warning or watch issued for the Central West district or Shire of Dandaragan.",
     "Forecast rainfall ≥10 mm in 24 hours for site or the Cervantes–site route.",
     "Rain falling on the route, no ponding or softening observed.",
     "Main Roads WA or Shire advisory affecting Brand Highway or Cowalla Road."
    ],
    "response": [
     "Advance planning and forecast review before the end of the current shift, with contractor representatives (Procedure §5).",
     "Route condition report taken from the last vehicle in.",
     "Weather raised at the Daily SIMOPS Meeting (FRM-YMT-0013 §8) and at pre-start.",
     "Advance communication to crews: assessment will occur before mobilisation; personnel remain rostered and must present fit for work.",
     "Confirm accommodation facilities available if mobilisation is delayed."
    ],
    "authority": "Site Supervisor / SHEQ Advisor"
   },
   {
    "n": 2,
    "name": "RESTRICT",
    "color": "#E0A800",
    "triggers": [
     "Rainfall ≥10 mm/hr, or ≥25 mm accumulated in 24 hours (ERMP §10.2.3).",
     "Standing water, softening or rutting observed on the unsealed route — route still trafficable.",
     "Visibility 100–500 m (ERMP §10.2.4).",
     "Route trafficable now but forecast to deteriorate during the shift."
    ],
    "response": [
     "Travel hold issued — no person travels to site until authorised (Procedure §6).",
     "Management assessment meeting, then route and site assessment where safe (Procedure §§7–8).",
     "If mobilising: convoy travel, reduced speed, UHF 24 on, headlights on, no solo travel, nominated check-in.",
     "Review open excavations, sediment controls and ESCP per ERMP §10.2.3.",
     "Set a reassessment time and a cut-off time; record both.",
     "Assess return travel before crews are released at end of shift."
    ],
    "authority": "Most senior Genus Construction representative on duty, in consultation with Genus Safety"
   },
   {
    "n": 3,
    "name": "CEASE / HOLD",
    "color": "#F07D00",
    "triggers": [
     "Water across the route, washout, or route assessed as not trafficable.",
     "Main Roads WA or Shire Road closure on the access route.",
     "Visibility <100 m (ERMP §10.2.4).",
     "Route cannot be relied on to remain safe for return travel before shift end."
    ],
    "response": [
     "No mobilisation. Personnel held at the Cervantes accommodation, fit for work and available.",
     "Alternative productive activities — toolbox meetings, work planning, skills development (Procedure §§11 and 14.5).",
     "Crews already on site: cease work and return while the route remains passable (Procedure §13).",
     "Reassess at the nominated time; declare a no-work day if not resolved by the cut-off.",
     "Complete the Adverse Weather and Inclement Weather Record, including the payroll fields (Procedure Appendix A)."
    ],
    "authority": "Most senior Genus Construction representative on duty, in consultation with Genus Safety; no-work day notified to the Project Director"
   },
   {
    "n": 4,
    "name": "ISOLATE / EVACUATE",
    "color": "#E00000",
    "triggers": [
     "Personnel on site and egress lost — route no longer passable in either direction.",
     "Personnel or a vehicle stranded on the route.",
     "Injury or emergency on site while the route is impassable.",
     "Sustained gust ≥80 km/h (ERMP §10.2.2), or evacuation directed by DFES / Emergency WA."
    ],
    "response": [
     "Activate the ERMP. Notify the Emergency Response Team and Project Director immediately.",
     "Headcount at the site office — all Genus, contractor, visitor and delivery personnel against sign-in.",
     "Shelter in place at the site office. Confirm drinking water, food, first aid, AED, fuel, heating or shade.",
     "Communications: UHF 24 primary, Starlink and satellite phone as backup.",
     "Medical emergency: 000 — advise the access constraint and nearest accessible point for emergency services.",
     "Notify Atmos through Asite, and by email to the Atmos representatives listed in the TARP.",
     "Do not attempt vehicle recovery or self-evacuation through floodwater."
    ],
    "authority": "Project Director / ERT Leader; Site Supervisor maintains headcount and welfare"
   }
  ],
  "standdown": [
   "Route re-inspected and confirmed trafficable by the senior Genus Construction representative and Genus Safety, with the forecast reviewed for the balance of the shift including the ability to return to accommodation in daylight.",
   "Decision, rationale, time and decision-maker recorded on the Adverse Weather and Inclement Weather Record and in the Site Diary; crews briefed before travel is authorised, and contractor supervision briefs their own personnel.",
   "Lightning: work resumes only 30 minutes after the last thunder or strike within 10 km (ERMP §10.2.1)."
  ],
  "doubt": "Stay at the higher level. Safety takes precedence over production, schedule, commercial and operational pressure. No person will be disadvantaged for declining to travel or work in these conditions, or for raising a concern about the route."
 },
 "evac": "assets/emergency/evacuation.jpg"
};
const TRAFFIC_MAPS=[
 {
  "id": "intersection",
  "title": "Site access intersection",
  "file": "assets/traffic/intersection.jpg",
  "note": "Stop and give-way control, no entry and keep left."
 },
 {
  "id": "office",
  "title": "Site office compound & laydown",
  "file": "assets/traffic/site-office-laydown.jpg",
  "note": "One-way circulation, LV reverse parking, muster points, 10 km/h shared zones."
 },
 {
  "id": "road",
  "title": "Main access road",
  "file": "assets/traffic/main-access-road.jpg",
  "note": "40 km/h, site office and laydown entries, heavy vehicle crossing, overhead power lines."
 },
 {
  "id": "turkeysnest",
  "title": "Turkeys nest access road",
  "file": "assets/traffic/turkeys-nest-road.jpg",
  "note": "Two-way track with pull-over bays, one-way loop at the turkeys nest, overhead power lines."
 },
 {
  "id": "entry",
  "title": "Site entry & wheel wash",
  "file": "assets/traffic/site-entry-wheel-wash.jpg",
  "note": "UHF Channel 24, wheel wash, visitor parking, 40 / 20 / 5 km/h zones."
 }
];
