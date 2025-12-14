const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const crypto = require('crypto');
require('dotenv').config();

// Modèles
const User = require('../models/User');
const Patient = require('../models/Patient');
const Analysis = require('../models/Analysis');
const Chat = require('../models/Chat');
const MedicalFile = require('../models/MedicalFile');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sante-securite';
const NUM_DOCTORS = 50;
const NUM_PATIENTS = 1000;
const ANALYSES_PER_PATIENT = 10;
const MEDICAL_FILES_PER_PATIENT = 5;
const MESSAGES_PER_CHAT = 15;

// Configurer faker en français
faker.locale = 'fr';

// Données de référence
const SPECIALTIES = [
  'Cardiologie', 'Dermatologie', 'Neurologie', 'Pédiatrie', 'Radiologie', 
  'Chirurgie', 'Médecine générale', 'Gynécologie', 'Ophtalmologie'
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ANALYSIS_TYPES = [
  'Hémogramme', 'Ionogramme', 'Bilan hépatique', 'Bilan rénal', 
  'Glycémie', 'Cholestérol', 'Triglycérides', 'TSH', 'Vitamine D'
];

// Fonction utilitaire pour insérer des données par lots
async function insertInBatches(model, data, batchSize = 100) {
  console.log(`Insertion de ${data.length} documents dans ${model.modelName}...`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await model.insertMany(batch, { ordered: false });
    process.stdout.write(`\r${Math.min(i + batchSize, data.length)}/${data.length} documents insérés`);
  }
  
  console.log(`\n${data.length} documents insérés avec succès dans ${model.modelName}`);
}

// Fonction pour générer une date aléatoire
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedMassiveDatabase() {
  try {
    console.log('Connexion à la base de données...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 60000
    });

    console.log('Nettoyage des collections existantes...');
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Analysis.deleteMany({}),
      Chat.deleteMany({}),
      MedicalFile.deleteMany({})
    ]);

    // 1. Création des médecins
    console.log('Création des médecins...');
    const doctors = Array.from({ length: NUM_DOCTORS }, (_, i) => {

      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      
      return {

        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@clinique.fr`,
        password: crypto.createHash('sha256').update('medecin123').digest('hex'),
        username: username,
        firstName,
        lastName,
        role: 'medecin',
        specialite: faker.helpers.arrayElement(SPECIALTIES),
        isChef: faker.datatype.boolean(0.2), // 20% de chefs de service
        service: faker.helpers.arrayElement(SPECIALTIES),
        phone: faker.phone.number('06########'),
        createdAt: randomDate(new Date(2020, 0, 1), new Date())
      };
    });

    const createdDoctors = await User.insertMany(doctors);
    console.log(`${createdDoctors.length} médecins créés.`);

    // 2. Création des patients
    console.log('Création des patients...');
    const patients = Array.from({ length: NUM_PATIENTS }, (_, i) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      const birthDate = randomDate(new Date(1950, 0, 1), new Date(2010, 0, 1));
      
      return {
        userId: new mongoose.Types.ObjectId(), // Créer un ID pour l'utilisateur patient
        username: username,
        firstName,
        lastName,
        dateNaissance: birthDate,
        groupeSanguin: faker.helpers.arrayElement(BLOOD_TYPES),
        medecinTraitant: faker.helpers.arrayElement(createdDoctors)._id,
        adresse: faker.location.streetAddress(),
        ville: faker.location.city(),
        codePostal: faker.location.zipCode('#####'),
        telephone: faker.phone.number('06########'),
        email: faker.internet.email(firstName, lastName).toLowerCase(),
        numSecuriteSociale: `1${faker.number.int({ min: 40, max: 99 })}${faker.number.int({ min: 1, max: 12 }).toString().padStart(2, '0')}${faker.number.int({ min: 1, max: 99 }).toString().padStart(2, '0')}${faker.number.int(99999)}`,
        createdAt: randomDate(new Date(2020, 0, 1), new Date())
      };
    });

    const createdPatients = await Patient.insertMany(patients);
    console.log(`${createdPatients.length} patients créés.`);

  // Création des utilisateurs patients - ultra robuste
const patientUsers = createdPatients.map((patient, index) => {
  // Toujours garantir que firstName et lastName existent
  const firstName = patient.firstName || 'Patient';
  const lastName = patient.lastName || `Inconnu${index}`;
  
  // Vérifier et nettoyer l'email
  let email = patient.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@patient.fr`;
  email = email.toLowerCase().trim();
  
  // Vérifier et nettoyer le username
  let username = patient.username || `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  username = username.toLowerCase().trim();
  
  return {
    _id: patient.userId || new mongoose.Types.ObjectId(),
    email: email,
    password: crypto.createHash('sha256').update('patient123').digest('hex'),
    username: username,
    firstName: firstName,
    lastName: lastName,
    role: 'patient',
    phone: patient.telephone || '06' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
    dateNaissance: patient.dateNaissance || new Date(1980, 0, 1),
    createdAt: patient.createdAt || new Date()
  };
});

console.log(`Création de ${patientUsers.length} comptes utilisateurs patients...`);
await User.insertMany(patientUsers);
console.log('Comptes utilisateurs patients créés.');

// 3. Création des analyses
console.log('Création des analyses...');
const analyses = [];

for (const patient of createdPatients) {
  const numAnalyses = faker.number.int({ 
    min: ANALYSES_PER_PATIENT - 3, 
    max: ANALYSES_PER_PATIENT + 3 
  });
  
  for (let i = 0; i < numAnalyses; i++) {
    const analysisDate = randomDate(new Date(2020, 0, 1), new Date());
    const analysisType = faker.helpers.arrayElement(ANALYSIS_TYPES);
    
    analyses.push({
      patientId: patient._id,
      laboratoryId: patient.medecinTraitant,
      analysisType,
      results: JSON.stringify({
        valeur: faker.number.float({ min: 0.1, max: 100, precision: 0.01 }),
        unite: faker.helpers.arrayElement(['mg/dL', 'g/L', 'UI/L', 'mmol/L']),
        statut: faker.helpers.arrayElement(['Normal', 'Hors norme', 'À surveiller'])
      }),
      notes: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
      status: faker.helpers.arrayElement(['pending', 'completed', 'reviewed']),
      analysisDate,
      filePath: faker.datatype.boolean() ? `/uploads/analyses/${faker.string.uuid()}.pdf` : null,
      createdAt: analysisDate
    });
  }
}

await insertInBatches(Analysis, analyses);
console.log(`${analyses.length} analyses créées.`);

 // 4. Création des dossiers médicaux
console.log('Création des dossiers médicaux...');
const medicalFiles = [];
const fileTypes = ['prescription', 'report', 'scanner', 'radiography', 'other'];

for (const patient of createdPatients) {
  const numFiles = faker.number.int({ 
    min: MEDICAL_FILES_PER_PATIENT - 2, 
    max: MEDICAL_FILES_PER_PATIENT + 2 
  });
  
  for (let i = 0; i < numFiles; i++) {
    medicalFiles.push({
      patient: patient._id,
      doctor: patient.medecinTraitant,
      title: `Document médical - ${faker.lorem.words(3)}`,
      description: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 })),
      fileUrl: `/uploads/medical-files/${faker.string.uuid()}.pdf`,
      fileType: faker.helpers.arrayElement(fileTypes),
      accessList: [patient.medecinTraitant],
      metadata: {
        dateExamen: randomDate(new Date(2020, 0, 1), new Date()).toISOString(),
        lieu: `Hôpital ${faker.location.city()}`,
        médecin: faker.person.fullName(),
        numDossier: `D${faker.number.int({ min: 10000, max: 99999 })}`
      },
      createdAt: randomDate(new Date(2020, 0, 1), new Date())
    });
  }
}

await insertInBatches(MedicalFile, medicalFiles);
console.log(`${medicalFiles.length} dossiers médicaux créés.`);
/*
// 5. Création des chats et messages
console.log('Création des conversations...');
const chats = [];
const messages = [];

for (const patient of createdPatients) {
  // Créer un chat entre le patient et son médecin traitant
  const chat = {
    participants: [patient.medecinTraitant, patient.userId],
    // AJOUT DES CHAMPS REQUIS PAR VOTRE SCHÉMA
    doctorId: patient.medecinTraitant,
    patientId: patient.userId,
    lastMessage: '',
    lastMessageAt: new Date(),
    unreadCount: 0,
    isGroup: false,
    createdAt: randomDate(new Date(2020, 0, 1), new Date())
  };
  
  const createdChat = await Chat.create(chat);
  
  // Générer des messages pour ce chat
  const numMessages = faker.number.int({ 
    min: Math.max(1, MESSAGES_PER_CHAT - 5), // Au moins 1 message
    max: MESSAGES_PER_CHAT + 5 
  });
  
  const chatMessages = [];
  let lastMessageDate = chat.createdAt;
  
  for (let i = 0; i < numMessages; i++) {
    const isFromDoctor = i % 2 === 0;
    const senderId = isFromDoctor ? patient.medecinTraitant : patient.userId;
    const messageDate = new Date(lastMessageDate.getTime() + faker.number.int({ min: 1000 * 60 * 5, max: 1000 * 60 * 60 * 24 * 3 }));
    
    const message = {
      chat: createdChat._id,
      sender: senderId,
      content: isFromDoctor 
        ? faker.lorem.sentences(faker.number.int({ min: 1, max: 2 }))
        : faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
      readBy: isFromDoctor ? [senderId] : [],
      // 20% de chance d'avoir une pièce jointe
      attachments: Math.random() < 0.2 
        ? [`/uploads/attachments/${faker.string.uuid()}.${faker.helpers.arrayElement(['pdf', 'jpg', 'png'])}`] 
        : [],
      createdAt: messageDate,
      updatedAt: messageDate
    };
    
    chatMessages.push(message);
    lastMessageDate = messageDate;
  }
  
  // Mettre à jour le dernier message du chat
  if (chatMessages.length > 0) {
    const lastMessage = chatMessages[chatMessages.length - 1];
    await Chat.findByIdAndUpdate(createdChat._id, {
      lastMessage: lastMessage.content.substring(0, 100),
      lastMessageAt: lastMessage.createdAt,
      unreadCount: faker.number.int({ min: 0, max: 5 }),
      updatedAt: new Date()
    });
  }
  
  messages.push(...chatMessages);
}

// Insérer tous les messages
await insertInBatches(Message, messages);
console.log(`${messages.length} messages créés.`);   
*/




    // 6. Mise à jour des références des médecins avec leurs patients
    console.log('Mise à jour des références des médecins...');
    const updatePromises = createdDoctors.map(doctor => {
      const doctorPatients = createdPatients.filter(
  p => p.medecinTraitant && p.medecinTraitant.equals(doctor._id)
);

      return User.updateOne(
        { _id: doctor._id },
        { 
          $addToSet: { patients: { $each: doctorPatients.map(p => p._id) } },
          $set: { updatedAt: new Date() }
        }
      );
    });

    await Promise.all(updatePromises);

    console.log('\nPeuplement terminé avec succès !');
    console.log('Résumé:');
    console.log(`- Médecins: ${createdDoctors.length}`);
    console.log(`- Patients: ${createdPatients.length}`);
    console.log(`- Analyses: ${analyses.length}`);
    console.log(`- Dossiers médicaux: ${medicalFiles.length}`);
   console.log(`- Chats: 0 (section désactivée)`);
console.log(`- Messages: 0 (section désactivée)`);

    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du peuplement de la base de données :', error);
    process.exit(1);
  }
}

seedMassiveDatabase();
