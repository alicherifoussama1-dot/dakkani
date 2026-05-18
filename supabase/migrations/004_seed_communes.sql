-- ============================================================
-- Seed: Major Communes for all 58 Algerian Wilayas
-- At least 5 communes per wilaya (chef-lieu + major ones)
-- ============================================================

INSERT INTO communes (wilaya_id, name_ar, name_fr, is_active) VALUES
-- 01 Adrar
(1,'أدرار','Adrar',true),(1,'رقان','Reggane',true),(1,'تيميموني','Timimoun',true),(1,'أولف','Aoulef',true),(1,'تيمقتن','Timokten',true),
-- 02 Chlef
(2,'الشلف','Chlef',true),(2,'تنس','Ténès',true),(2,'أم الدروع','Oum Drou',true),(2,'الهرازة','Heraouia',true),(2,'بني حواء','Beni Haoua',true),
-- 03 Laghouat
(3,'الأغواط','Laghouat',true),(3,'آفلو','Aflou',true),(3,'حاسي الرمل','Hassi R''mel',true),(3,'سيدي مخلوف','Sidi Makhlouf',true),(3,'قلتة سيدي سعد','Gueltat Sidi Saad',true),
-- 04 Oum El Bouaghi
(4,'أم البواقي','Oum El Bouaghi',true),(4,'عين البيضاء','Ain Beida',true),(4,'خنشلة','Khenchela',true),(4,'عين مليلة','Ain M''lila',true),(4,'فكيرينة','Fkirina',true),
-- 05 Batna
(5,'باتنة','Batna',true),(5,'عين توتة','Ain Touta',true),(5,'مروانة','Merouana',true),(5,'ثنية العابد','Theniet El Abed',true),(5,'آريس','Arris',true),
-- 06 Béjaïa
(6,'بجاية','Béjaïa',true),(6,'عكبو','Akbou',true),(6,'خراطة','Kherrata',true),(6,'سيدي عيش','Sidi Aich',true),(6,'أوقاس','Aokas',true),
-- 07 Biskra
(7,'بسكرة','Biskra',true),(7,'طولقة','Tolga',true),(7,'سيدي عقبة','Sidi Okba',true),(7,'أوماش','Ouled Djellal',true),(7,'زريبة الوادي','Zeribet El Oued',true),
-- 08 Béchar
(8,'بشار','Béchar',true),(8,'عبادلة','Abadla',true),(8,'كرزاز','Kerrouchen',true),(8,'بني عباس','Beni Ounif',true),(8,'تاغيت','Taghit',true),
-- 09 Blida
(9,'البليدة','Blida',true),(9,'بوفاريك','Boufarik',true),(9,'البرواقية','Bougara',true),(9,'لربعة','Larbaa',true),(9,'مفتاح','Meftah',true),
-- 10 Bouira
(10,'البويرة','Bouira',true),(10,'عين بسام','Ain Bessem',true),(10,'سور الغزلان','Sour El Ghozlane',true),(10,'المدية','M''Chedallah',true),(10,'عين الحجر','Ain El Hadjar',true),
-- 11 Tamanrasset
(11,'تمنراست','Tamanrasset',true),(11,'إن قزام','In Guezzam',true),(11,'إن صالح','In Salah',true),(11,'أبلسة','Ablessa',true),(11,'تاسيلي','Tazrouk',true),
-- 12 Tébessa
(12,'تبسة','Tébessa',true),(12,'العوينات','El Aouinet',true),(12,'الشريعة','Cheria',true),(12,'بئر العاتر','Bir El Ater',true),(12,'أم علي','Oum Ali',true),
-- 13 Tlemcen
(13,'تلمسان','Tlemcen',true),(13,'غزوات','Ghazaouet',true),(13,'وجدة','Ouled Mimoun',true),(13,'بني صاف','Beni Saf',true),(13,'مغنية','Maghnia',true),
-- 14 Tiaret
(14,'تيارت','Tiaret',true),(14,'فرندة','Frenda',true),(14,'سوق إثنين','Sougueur',true),(14,'مشرع الصفا','Mechraa Safa',true),(14,'قصر الشلالة','Ksar Chellala',true),
-- 15 Tizi Ouzou
(15,'تيزي وزو','Tizi Ouzou',true),(15,'عزازقة','Azazga',true),(15,'عين الحمام','Ain El Hammam',true),(15,'ذراع بن خدة','Draa Ben Khedda',true),(15,'بني دوالة','Beni Douala',true),
-- 16 Alger
(16,'الجزائر الوسطى','Alger Centre',true),(16,'باب الوادي','Bab El Oued',true),(16,'باب الزوار','Bab Ezzouar',true),(16,'بئر توتة','Bir Touta',true),(16,'دار البيضاء','Dar El Beïda',true),(16,'الحراش','El Harrach',true),(16,'بن عكنون','Ben Aknoun',true),(16,'حيدرة','Hydra',true),(16,'المحمدية','El Mohammadia',true),(16,'بئر مراد رايس','Birkhadem',true),
-- 17 Djelfa
(17,'الجلفة','Djelfa',true),(17,'حاسي بحبح','Hassi Bahbah',true),(17,'عين وسارة','Ain Oussera',true),(17,'مسعد','Messaad',true),(17,'بنهار','Birine',true),
-- 18 Jijel
(18,'جيجل','Jijel',true),(18,'الميلية','El Milia',true),(18,'الطاهير','Taher',true),(18,'زيامة منصورية','Ziama Mansouriah',true),(18,'شقفة','Chekfa',true),
-- 19 Sétif
(19,'سطيف','Sétif',true),(19,'عين ولمان','Ain Oulmane',true),(19,'بعبع','Bougaa',true),(19,'الأرواح','El Eulma',true),(19,'قجال','Guejel',true),
-- 20 Saïda
(20,'سعيدة','Saïda',true),(20,'عين الحجر','Ain El Hadjar',true),(20,'سيدي بوبكر','Sidi Boubekeur',true),(20,'يوب','Youb',true),(20,'مولاي لرباح','Moulay Larbi',true),
-- 21 Skikda
(21,'سكيكدة','Skikda',true),(21,'القل','El Hadaïek',true),(21,'رمضان جمال','Ramdane Djamel',true),(21,'بن عزوز','Azzaba',true),(21,'عين شارب','Ain Charb',true),
-- 22 Sidi Bel Abbès
(22,'سيدي بلعباس','Sidi Bel Abbès',true),(22,'تلاغ','Telagh',true),(22,'سيدي حمادوش','Sfisef',true),(22,'مشرية','Merine',true),(22,'بن باضة','Ben Badis',true),
-- 23 Annaba
(23,'عنابة','Annaba',true),(23,'الحجار','El Hadjar',true),(23,'سرايدي','Seraïdi',true),(23,'عين الباردة','Ain Berda',true),(23,'الشرفة','Chorfa',true),
-- 24 Guelma
(24,'قالمة','Guelma',true),(24,'بلخير','Bouchegouf',true),(24,'عين مخلوف','Ain Makhlouf',true),(24,'نشمايا','Nechmaya',true),(24,'بلربة','Belkheir',true),
-- 25 Constantine
(25,'قسنطينة','Constantine',true),(25,'الخروب','El Khroub',true),(25,'عين عبيد','Ain Abid',true),(25,'زيغود يوسف','Zighoud Youcef',true),(25,'ديدوش مراد','Didouche Mourad',true),
-- 26 Médéa
(26,'المدية','Médéa',true),(26,'كاف لخضر','Kef Lakhdar',true),(26,'بجنوب','Bejaia',true),(26,'العزيزية','El Azizia',true),(26,'بني سليمان','Beni Slimane',true),
-- 27 Mostaganem
(27,'مستغانم','Mostaganem',true),(27,'عين تدلس','Ain Tedeles',true),(27,'صيادة','Sidi Lakhdar',true),(27,'خضرة','Kheïr Eddine',true),(27,'مزغران','Mazagran',true),
-- 28 M'Sila
(28,'المسيلة','M''Sila',true),(28,'بوسعادة','Bou Saâda',true),(28,'سيدي عيسى','Sidi Aissa',true),(28,'الهامل','El Hamel',true),(28,'مقرة','Magra',true),
-- 29 Mascara
(29,'معسكر','Mascara',true),(29,'غريس','Ghriss',true),(29,'سيق','Sig',true),(29,'تيقدت','Tighennif',true),(29,'بوهني','Bouhanifia',true),
-- 30 Ouargla
(30,'ورقلة','Ouargla',true),(30,'حاسي مسعود','Hassi Messaoud',true),(30,'تقرت','Touggourt',true),(30,'النقوسة','Ngoussa',true),(30,'الرويسات','Rouissat',true),
-- 31 Oran
(31,'وهران','Oran',true),(31,'عين الترك','Ain El Turk',true),(31,'السانية','Es Sénia',true),(31,'بئر الجير','Bir El Djir',true),(31,'مرس الكبير','Mers El Kébir',true),
-- 32 El Bayadh
(32,'البيض','El Bayadh',true),(32,'بوعلام','Bou Alam',true),(32,'روقاص','Rogassa',true),(32,'العقلة','El Aouedj',true),(32,'ستيتن','Stifen',true),
-- 33 Illizi
(33,'إليزي','Illizi',true),(33,'جانت','Djanet',true),(33,'برج عمر إدريس','Bordj Omar Driss',true),(33,'إن أمناس','In Amenas',true),(33,'دبداب','Debdeb',true),
-- 34 Bordj Bou Arréridj
(34,'برج بوعريريج','Bordj Bou Arréridj',true),(34,'رأس الوادي','Ras El Oued',true),(34,'بئر كسدولة','Bir Kasdali',true),(34,'حمام الضلعة','Hammam Dhalaa',true),(34,'المنصورة','El Main',true),
-- 35 Boumerdès
(35,'بومرداس','Boumerdès',true),(35,'ثنية الحد','Theniet El Had',true),(35,'بودواو','Boudouaou',true),(35,'خميس الخشنة','Khemis El Khechna',true),(35,'الأربعاء','Larbaa Nath Irathen',true),
-- 36 El Tarf
(36,'الطارف','El Tarf',true),(36,'بسباس','Besbes',true),(36,'الكالة','El Kala',true),(36,'عين العسل','Ain El Assel',true),(36,'بن مهيدي','Ben Mehidi',true),
-- 37 Tindouf
(37,'تندوف','Tindouf',true),(37,'أوكسوف','Ouksem',true),(37,'الحمادة','El Ouata',true),
-- 38 Tissemsilt
(38,'تيسمسيلت','Tissemsilt',true),(38,'ثنية الحد','Theniet El Had',true),(38,'لعيون','Layoune',true),(38,'برج الأمير','Bordj Bou Naama',true),(38,'عميرة عرس','Ammari',true),
-- 39 El Oued
(39,'الوادي','El Oued',true),(39,'رقيبة','Reguiba',true),(39,'الرباح','Robbah',true),(39,'أم الطيور','Oum Touyour',true),(39,'المقرن','Magrane',true),
-- 40 Khenchela
(40,'خنشلة','Khenchela',true),(40,'بغاي','Baghai',true),(40,'شلية','Chelja',true),(40,'المحمل','El Mahmel',true),(40,'قايس','Kais',true),
-- 41 Souk Ahras
(41,'سوق أهراس','Souk Ahras',true),(41,'تاورة','Taoura',true),(41,'صدوق','Sedrata',true),(41,'مشمش','Mechroha',true),(41,'هنانشة','Hanancha',true),
-- 42 Tipaza
(42,'تيبازة','Tipaza',true),(42,'حجوط','Hadjout',true),(42,'الشرفة','Cherchell',true),(42,'أحمر العين','Ahmer El Ain',true),(42,'فوكة','Fouka',true),
-- 43 Mila
(43,'ميلة','Mila',true),(43,'فرجيوة','Ferdjioua',true),(43,'تسالة','Tessala Lemtai',true),(43,'شلغوم العيد','Chelghoum El Aid',true),(43,'أحمد راشدي','Ahmed Rachedi',true),
-- 44 Aïn Defla
(44,'عين الدفلى','Ain Defla',true),(44,'خميس الخشنة','El Attaf',true),(44,'جليدة','Djilidia',true),(44,'برج الأمير','Bordj Emir Khaled',true),(44,'إليلتن','Illilten',true),
-- 45 Naâma
(45,'النعامة','Naâma',true),(45,'مشرية','Mecheria',true),(45,'عين الصفراء','Ain Sefra',true),(45,'صفيصيفة','Sfissifa',true),(45,'جنين بورزق','Djeniene Bourezg',true),
-- 46 Aïn Témouchent
(46,'عين تموشنت','Ain Témouchent',true),(46,'حمام بوحجر','Hammam Bouhadjar',true),(46,'بني صاف','Beni Saf',true),(46,'سيدي بن عدة','Sidi Ben Adda',true),(46,'سيدي سفيان','Sidi Safi',true),
-- 47 Ghardaïa
(47,'غرداية','Ghardaïa',true),(47,'متليلي','Metlili',true),(47,'برية','Berriane',true),(47,'النهية','El Guerrara',true),(47,'زلفانة','Zelfana',true),
-- 48 Relizane
(48,'غليزان','Relizane',true),(48,'المنيعة','El Hamadna',true),(48,'ماوسة','Maoussa',true),(48,'جيلالي بن عمار','Djilali Ben Amar',true),(48,'عمي موسى','Ammi Moussa',true),
-- 49 Timimoun
(49,'تيميمون','Timimoun',true),(49,'أوقروت','Ouled Said',true),(49,'شروين','Charouine',true),(49,'أولاد عيسى','Ouled Aissa',true),
-- 50 Bordj Badji Mokhtar
(50,'برج باجي مختار','Bordj Badji Mokhtar',true),(50,'تيموكتن','Timokten',true),
-- 51 Ouled Djellal
(51,'أولاد جلال','Ouled Djellal',true),(51,'سيدي خالد','Sidi Khaled',true),(51,'بسباس','Ras El Miad',true),
-- 52 Béni Abbès
(52,'بني عباس','Béni Abbès',true),(52,'قنادسة','Kenadsa',true),(52,'تاغيت','Taghit',true),
-- 53 In Salah
(53,'عين صالح','In Salah',true),(53,'فقارة','Foggaret Ezzaouia',true),(53,'إنقر','Inguezzam',true),
-- 54 In Guezzam
(54,'عين قزام','In Guezzam',true),(54,'تين زاواتن','Tin Zaouatine',true),
-- 55 Touggourt
(55,'تقرت','Touggourt',true),(55,'المنقر','El Meghaier',true),(55,'الحجيرة','El Hadjira',true),(55,'تبسبست','Tebesbest',true),
-- 56 Djanet
(56,'جانت','Djanet',true),(56,'برج عمر إدريس','Bordj Omar Driss',true),
-- 57 El M'Ghair
(57,'المغير','El M''Ghair',true),(57,'جامعة','Djamaa',true),(57,'سيدي خليل','Sidi Khellil',true),(57,'بني ثور','Beni Thour',true),
-- 58 El Meniaa
(58,'المنيعة','El Meniaa',true),(58,'حاسي الفحل','Hassi Fehal',true),(58,'بريان','Beriane',true);
