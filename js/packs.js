// Qarbon's built-in word packs, as text in the same CSV format as the files in the project folder
// (beginner150.csv, level2-150.csv). They live in a script file so they also work offline and when
// index.html is opened straight from the Mac (the browser won't let a page read those CSV files then).
// If a CSV file changes, update its copy here too.
const PACKS = {
  beginner150: `
front,back,part_of_speech,gender,example_target,example_english,tags
le / la,the,article,none,Le chat dort sur la table.,The cat sleeps on the table.,A1;core
un / une,a / an,article,none,J'ai un frère et une soeur.,I have a brother and a sister.,A1;core
de,of / from,preposition,none,Je viens de Paris.,I come from Paris.,A1;core
et,and,conjunction,none,Du pain et du fromage.,Bread and cheese.,A1;core
à,to / at,preposition,none,Nous allons à l'école.,We are going to school.,A1;core
être,to be,verb,none,Je suis fatigué.,I am tired.,A1;core
avoir,to have,verb,none,Elle a deux chats.,She has two cats.,A1;core
je,I,pronoun,none,Je parle français.,I speak French.,A1;core
tu,you (informal),pronoun,none,Tu es mon ami.,You are my friend.,A1;core
il,he / it,pronoun,none,Il habite à Lyon.,He lives in Lyon.,A1;core
elle,she / it,pronoun,none,Elle travaille ici.,She works here.,A1;core
nous,we,pronoun,none,Nous mangeons à midi.,We eat at noon.,A1;core
vous,you (formal or plural),pronoun,none,Vous êtes très gentil.,You are very kind.,A1;core
ils,they (masculine or mixed),pronoun,none,Ils sont en vacances.,They are on vacation.,A1;core
ne ... pas,not,adverb,none,Je ne sais pas.,I do not know.,A1;core
que,that / what / than,conjunction,none,Je pense que c'est bon.,I think that it is good.,A1;core
qui,who / which,pronoun,none,Qui est là ?,Who is there?,A1;core
ce / cet / cette,this / that,determiner,none,Ce livre est intéressant.,This book is interesting.,A1;core
pour,for,preposition,none,Ce cadeau est pour toi.,This gift is for you.,A1;core
dans,in,preposition,none,Le livre est dans le sac.,The book is in the bag.,A1;core
avec,with,preposition,none,Je voyage avec mon frère.,I travel with my brother.,A1;core
sur,on,preposition,none,Le verre est sur la table.,The glass is on the table.,A1;core
mais,but,conjunction,none,Je veux venir mais je suis occupé.,I want to come but I am busy.,A1;core
ou,or,conjunction,none,Tu veux du thé ou du café ?,Do you want tea or coffee?,A1;core
oui,yes,adverb,none,Oui je veux bien.,Yes I would like that.,A1;core
non,no,adverb,none,Non merci.,No thank you.,A1;core
très,very,adverb,none,Il fait très chaud.,It is very hot.,A1;core
aussi,also / too,adverb,none,Moi aussi j'aime le café.,I like coffee too.,A1;core
faire,to do / to make,verb,none,Je fais mes devoirs.,I am doing my homework.,A1;core
aller,to go,verb,none,Nous allons au marché.,We are going to the market.,A1;core
dire,to say / to tell,verb,none,Que dis-tu ?,What are you saying?,A1;core
pouvoir,to be able to / can,verb,none,Je peux t'aider.,I can help you.,A1;core
vouloir,to want,verb,none,Elle veut un café.,She wants a coffee.,A1;core
savoir,to know (a fact or how to),verb,none,Je sais nager.,I know how to swim.,A1;core
voir,to see,verb,none,Je vois la mer.,I see the sea.,A1;core
venir,to come,verb,none,Tu viens ce soir ?,Are you coming tonight?,A1;core
le temps,time / weather,noun,m,Je n'ai pas le temps.,I do not have time.,A1;core
la personne,person,noun,f,Cette personne est très gentille.,This person is very kind.,A1;core
le jour,day,noun,m,Quel jour sommes-nous ?,What day is it?,A1;core
l'homme,man,noun,m,L'homme lit le journal.,The man reads the newspaper.,A1;core
la femme,woman / wife,noun,f,La femme parle au téléphone.,The woman is talking on the phone.,A1;core
l'enfant,child,noun,m/f,L'enfant joue dans le jardin.,The child plays in the garden.,A1;core
la vie,life,noun,f,La vie est belle.,Life is beautiful.,A1;core
le monde,world / people,noun,m,Il y a beaucoup de monde ici.,There are a lot of people here.,A1;core
la maison,house / home,noun,f,Ma maison est petite.,My house is small.,A1;core
bon / bonne,good,adjective,none,C'est un bon livre.,It is a good book.,A1;core
grand / grande,big / tall,adjective,none,Mon frère est très grand.,My brother is very tall.,A1;core
petit / petite,small / little,adjective,none,J'ai un petit chat.,I have a small cat.,A1;core
nouveau / nouvelle,new,adjective,none,J'ai un nouveau travail.,I have a new job.,A1;core
ici,here,adverb,none,Viens ici.,Come here.,A1;core

donner,to give,verb,none,Je te donne mon numéro.,I give you my number.,A1;core
prendre,to take,verb,none,Je prends le bus.,I take the bus.,A1;core
mettre,to put,verb,none,Il met le livre sur la table.,He puts the book on the table.,A1;core
devoir,to have to / must / to owe,verb,none,Je dois partir.,I have to leave.,A1;core
il faut,it is necessary / one must,expression,none,Il faut du temps.,It takes time.,A1;core
aimer,to like / to love,verb,none,J'aime le chocolat.,I like chocolate.,A1;core
parler,to speak / to talk,verb,none,Elle parle trois langues.,She speaks three languages.,A1;core
penser,to think,verb,none,Je pense à toi.,I am thinking of you.,A1;core
trouver,to find,verb,none,Je ne trouve pas mes clés.,I cannot find my keys.,A1;core
demander,to ask,verb,none,Il demande l'heure.,He asks the time.,A1;core
passer,to pass / to spend (time),verb,none,Nous passons le week-end à la mer.,We spend the weekend at the sea.,A1;core
comprendre,to understand,verb,none,Je ne comprends pas.,I do not understand.,A1;core
attendre,to wait (for),verb,none,J'attends le bus.,I am waiting for the bus.,A1;core
connaître,to know (a person or place),verb,none,Je connais ce restaurant.,I know this restaurant.,A1;core
partir,to leave,verb,none,Le train part à huit heures.,The train leaves at eight.,A1;core
arriver,to arrive / to happen,verb,none,Nous arrivons demain.,We arrive tomorrow.,A1;core
regarder,to look at / to watch,verb,none,Je regarde un film.,I am watching a movie.,A1;core
appeler,to call,verb,none,J'appelle ma mère.,I am calling my mother.,A1;core
rester,to stay,verb,none,Je reste à la maison.,I am staying at home.,A1;core
où,where,adverb,none,Où est la gare ?,Where is the train station?,A1;core
quand,when,adverb,none,Quand arrives-tu ?,When are you arriving?,A1;core
comment,how,adverb,none,Comment allez-vous ?,How are you?,A1;core
pourquoi,why,adverb,none,Pourquoi es-tu triste ?,Why are you sad?,A1;core
tout / toute,all / every / everything,adjective,none,Tout le monde est là.,Everyone is here.,A1;core
beaucoup,a lot / much,adverb,none,Il mange beaucoup.,He eats a lot.,A1;core
un peu,a little,adverb,none,Je parle un peu français.,I speak a little French.,A1;core
plus,more,adverb,none,Je veux plus de pain.,I want more bread.,A1;core
bien,well / good,adverb,none,Tu parles bien.,You speak well.,A1;core
encore,again / still / more,adverb,none,Encore un café s'il vous plaît.,Another coffee please.,A1;core
toujours,always / still,adverb,none,Il est toujours en retard.,He is always late.,A1;core
jamais,never / ever,adverb,none,Je ne mange jamais de viande.,I never eat meat.,A1;core
maintenant,now,adverb,none,Je suis libre maintenant.,I am free now.,A1;core
déjà,already,adverb,none,J'ai déjà mangé.,I have already eaten.,A1;core
alors,so / then,adverb,none,Il pleut alors je reste ici.,It is raining so I am staying here.,A1;core
parce que,because,conjunction,none,Je reste parce que je suis fatigué.,I am staying because I am tired.,A1;core
si,if,conjunction,none,Je viens si tu viens.,I am coming if you come.,A1;core
mon / ma / mes,my,determiner,none,Mon frère habite à Paris.,My brother lives in Paris.,A1;core
son / sa / ses,his / her / its,determiner,none,Sa maison est grande.,His or her house is big.,A1;core
il y a,there is / there are,expression,none,Il y a un chat dans le jardin.,There is a cat in the garden.,A1;core
le travail,work / job,noun,m,Mon travail est intéressant.,My job is interesting.,A1;core
l'ami / l'amie,friend,noun,m/f,Mon ami habite à Nice.,My friend lives in Nice.,A1;core
la chose,thing,noun,f,C'est une bonne chose.,It is a good thing.,A1;core
la main,hand,noun,f,J'ai mal à la main.,My hand hurts.,A1;core
le père,father,noun,m,Mon père travaille beaucoup.,My father works a lot.,A1;core
la mère,mother,noun,f,Ma mère cuisine bien.,My mother cooks well.,A1;core
la ville,city / town,noun,f,La ville est très belle.,The city is very beautiful.,A1;core
l'année,year,noun,f,Cette année je vais en France.,This year I am going to France.,A1;core
le matin,morning,noun,m,Je bois du café le matin.,I drink coffee in the morning.,A1;core
la nuit,night,noun,f,La nuit est calme.,The night is calm.,A1;core
le pays,country,noun,m,La France est un beau pays.,France is a beautiful country.,A1;core

manger,to eat,verb,none,Je mange une pomme.,I am eating an apple.,A1;core
boire,to drink,verb,none,Elle boit de l'eau.,She is drinking water.,A1;core
habiter,to live (reside),verb,none,J'habite dans une petite ville.,I live in a small town.,A1;core
travailler,to work,verb,none,Il travaille tous les jours.,He works every day.,A1;core
acheter,to buy,verb,none,J'achète du pain.,I am buying bread.,A1;core
commencer,to begin / to start,verb,none,Le cours commence à neuf heures.,The class starts at nine.,A1;core
finir,to finish,verb,none,Je finis mon travail.,I am finishing my work.,A1;core
écouter,to listen (to),verb,none,J'écoute de la musique.,I listen to music.,A1;core
écrire,to write,verb,none,Elle écrit une lettre.,She is writing a letter.,A1;core
lire,to read,verb,none,Je lis un livre.,I am reading a book.,A1;core
jouer,to play,verb,none,Les enfants jouent dehors.,The children play outside.,A1;core
apprendre,to learn,verb,none,J'apprends le français.,I am learning French.,A1;core
croire,to believe,verb,none,Je te crois.,I believe you.,A1;core
le café,coffee,noun,m,Le café est chaud.,The coffee is hot.,A1;core
le pain,bread,noun,m,Le pain est frais.,The bread is fresh.,A1;core
la famille,family,noun,f,Ma famille est grande.,My family is big.,A1;core
le frère,brother,noun,m,Mon frère a dix ans.,My brother is ten years old.,A1;core
la soeur,sister,noun,f,Ma soeur habite à Lyon.,My sister lives in Lyon.,A1;core
le garçon,boy / waiter,noun,m,Le garçon joue au foot.,The boy plays soccer.,A1;core
la fille,girl / daughter,noun,f,La fille lit un livre.,The girl is reading a book.,A1;core
l'école,school,noun,f,L'école commence à huit heures.,School starts at eight.,A1;core
le livre,book,noun,m,Ce livre est très bon.,This book is very good.,A1;core
la voiture,car,noun,f,Ma voiture est rouge.,My car is red.,A1;core
la rue,street,noun,f,La rue est calme.,The street is quiet.,A1;core
l'argent,money / silver,noun,m,Je n'ai pas d'argent.,I have no money.,A1;core
le nom,name / noun,noun,m,Quel est ton nom ?,What is your name?,A1;core
l'heure,hour / time,noun,f,Quelle heure est-il ?,What time is it?,A1;core
la semaine,week,noun,f,Je travaille toute la semaine.,I work all week.,A1;core
le soir,evening,noun,m,Le soir nous mangeons ensemble.,In the evening we eat together.,A1;core
la table,table,noun,f,La table est dans la cuisine.,The table is in the kitchen.,A1;core
beau / belle,beautiful / handsome,adjective,none,Il fait beau aujourd'hui.,The weather is nice today.,A1;core
jeune,young,adjective,none,Elle est très jeune.,She is very young.,A1;core
vieux / vieille,old,adjective,none,C'est un vieux livre.,It is an old book.,A1;core
content / contente,happy / pleased,adjective,none,Je suis content de te voir.,I am happy to see you.,A1;core
facile,easy,adjective,none,Ce mot est facile.,This word is easy.,A1;core
difficile,difficult,adjective,none,L'examen est difficile.,The exam is difficult.,A1;core
même,same / even,adjective,none,Nous avons le même livre.,We have the same book.,A1;core
avant,before,preposition,none,Je mange avant midi.,I eat before noon.,A1;core
après,after,preposition,none,Après le travail je rentre.,After work I go home.,A1;core
sous,under,preposition,none,Le chat est sous la table.,The cat is under the table.,A1;core
entre,between,preposition,none,La banque est entre la gare et l'école.,The bank is between the station and the school.,A1;core
chez,at the home of,preposition,none,Je suis chez moi.,I am at home.,A1;core
sans,without,preposition,none,Je bois mon café sans sucre.,I drink my coffee without sugar.,A1;core
pendant,during / for,preposition,none,Je lis pendant une heure.,I read for an hour.,A1;core
près,near / close,adverb,none,La gare est près d'ici.,The station is near here.,A1;core
loin,far,adverb,none,Mon travail est loin.,My work is far.,A1;core
demain,tomorrow,adverb,none,À demain !,See you tomorrow!,A1;core
hier,yesterday,adverb,none,Hier j'ai mangé au restaurant.,Yesterday I ate at the restaurant.,A1;core
aujourd'hui,today,adverb,none,Aujourd'hui il pleut.,It is raining today.,A1;core
merci,thank you,interjection,none,Merci beaucoup.,Thank you very much.,A1;core
`,
  level2: `
front,back,part_of_speech,gender,example_target,example_english,tags
ouvrir,to open,verb,none,"Ouvre la porte, s'il te plaît.","Open the door, please.",A1;core
fermer,to close,verb,none,Je ferme la fenêtre.,I am closing the window.,A1;core
sortir,to go out / to leave,verb,none,Nous sortons ce soir.,We are going out tonight.,A1;core
entrer,to enter / to come in,verb,none,"Entrez, je vous en prie.","Come in, please.",A1;core
rentrer,to go home / to return,verb,none,Je rentre à six heures.,I am going home at six.,A1;core
tomber,to fall,verb,none,Le livre tombe de la table.,The book falls off the table.,A1;core
vivre,to live,verb,none,Ils vivent en France.,They live in France.,A1;core
choisir,to choose,verb,none,Je choisis le café.,I choose the coffee.,A2;core
chercher,to look for,verb,none,Je cherche mes clés.,I am looking for my keys.,A1;core
porter,to carry / to wear,verb,none,Elle porte un manteau rouge.,She is wearing a red coat.,A2;core
montrer,to show,verb,none,Il montre la photo à sa mère.,He shows the photo to his mother.,A2;core
suivre,to follow,verb,none,Suivez-moi.,Follow me.,A2;core
perdre,to lose,verb,none,J'ai peur de perdre mon téléphone.,I am afraid of losing my phone.,A2;core
gagner,to win / to earn,verb,none,Notre équipe gagne le match.,Our team wins the match.,A2;core
rencontrer,to meet,verb,none,Je rencontre mon ami au café.,I am meeting my friend at the café.,A2;core
répondre,to answer,verb,none,Je réponds à ta question.,I am answering your question.,A1;core
payer,to pay,verb,none,Je paie avec ma carte.,I pay with my card.,A1;core
oublier,to forget,verb,none,N'oublie pas ton billet.,Do not forget your ticket.,A2;core
dormir,to sleep,verb,none,Le bébé dort dans sa chambre.,The baby sleeps in his room.,A1;core
marcher,to walk / to work (function),verb,none,Nous marchons jusqu'à la gare.,We walk to the station.,A1;core
laisser,to leave (behind) / to let,verb,none,Je laisse mon sac ici.,I am leaving my bag here.,A2;core
sentir,to feel / to smell,verb,none,Je sens une odeur de pain.,I smell bread.,A2;core
recevoir,to receive,verb,none,Je reçois un message de ma soeur.,I receive a message from my sister.,A2;core
envoyer,to send,verb,none,J'envoie une lettre à mon père.,I am sending a letter to my father.,A2;core
aider,to help,verb,none,Peux-tu m'aider ?,Can you help me?,A1;core
la tête,head,noun,f,J'ai mal à la tête.,I have a headache.,A1;core
le mot,word,noun,m,Je ne connais pas ce mot.,I do not know this word.,A1;core
la question,question,noun,f,J'ai une question.,I have a question.,A1;core
la réponse,answer,noun,f,La réponse est facile.,The answer is easy.,A1;core
le problème,problem,noun,m,Il n'y a pas de problème.,There is no problem.,A1;core
la fois,time / occasion,noun,f,Une fois par semaine.,Once a week.,A1;core
la place,seat / square / room,noun,f,Il y a une place ici.,There is a seat here.,A1;core
la fin,end,noun,f,C'est la fin du film.,It is the end of the movie.,A1;core
la porte,door,noun,f,La porte est ouverte.,The door is open.,A1;core
la fenêtre,window,noun,f,La fenêtre est fermée.,The window is closed.,A1;core
la chambre,bedroom,noun,f,Ma chambre est petite.,My bedroom is small.,A1;core
la cuisine,kitchen / cooking,noun,f,Elle est dans la cuisine.,She is in the kitchen.,A1;core
le jardin,garden,noun,m,Les enfants jouent dans le jardin.,The children play in the garden.,A1;core
le chat,cat,noun,m,Le chat dort.,The cat is sleeping.,A1;core
le chien,dog,noun,m,Le chien est dans le jardin.,The dog is in the garden.,A1;core
le repas,meal,noun,m,Le repas est prêt.,The meal is ready.,A1;core
l'eau,water,noun,f,Je voudrais de l'eau.,I would like some water.,A1;core
le soleil,sun,noun,m,Le soleil brille.,The sun is shining.,A1;core
la pluie,rain,noun,f,La pluie tombe depuis ce matin.,The rain has been falling since this morning.,A2;core
le téléphone,phone,noun,m,Mon téléphone est sur la table.,My phone is on the table.,A1;core
l'ordinateur,computer,noun,m,J'utilise mon ordinateur tous les jours.,I use my computer every day.,A1;core
le film,movie,noun,m,Ce film est très bon.,This movie is very good.,A1;core
la musique,music,noun,f,J'aime la musique française.,I like French music.,A1;core
le voyage,trip / journey,noun,m,Le voyage est long.,The trip is long.,A1;core
la gare,train station,noun,f,La gare est près d'ici.,The train station is near here.,A1;core
le train,train,noun,m,Le train arrive à huit heures.,The train arrives at eight.,A1;core
le billet,ticket,noun,m,J'ai un billet pour Paris.,I have a ticket for Paris.,A1;core
le magasin,shop / store,noun,m,Le magasin ferme à sept heures.,The shop closes at seven.,A1;core
le marché,market,noun,m,Nous allons au marché le samedi.,We go to the market on Saturdays.,A1;core
le restaurant,restaurant,noun,m,Le restaurant est près de la gare.,The restaurant is near the station.,A1;core
le prix,price / prize,noun,m,Quel est le prix ?,What is the price?,A1;core
l'idée,idea,noun,f,C'est une bonne idée.,It is a good idea.,A1;core
l'histoire,story / history,noun,f,C'est une belle histoire.,It is a lovely story.,A2;core
la langue,language / tongue,noun,f,Le français est une belle langue.,French is a beautiful language.,A1;core
le médecin,doctor,noun,m,Je vais chez le médecin.,I am going to the doctor.,A1;core
le mois,month,noun,m,Je pars le mois prochain.,I am leaving next month.,A2;core
le bureau,office / desk,noun,m,Je travaille au bureau.,I work at the office.,A1;core
la photo,photo,noun,f,Je regarde la photo.,I am looking at the photo.,A1;core
chaud / chaude,hot / warm,adjective,none,Le café est chaud.,The coffee is hot.,A1;core
froid / froide,cold,adjective,none,L'eau est froide.,The water is cold.,A1;core
cher / chère,expensive / dear,adjective,none,Ce livre est trop cher.,This book is too expensive.,A1;core
prêt / prête,ready,adjective,none,Je suis prêt.,I am ready.,A1;core
seul / seule,alone / only,adjective,none,Elle habite seule.,She lives alone.,A1;core
heureux / heureuse,happy,adjective,none,Nous sommes très heureux.,We are very happy.,A1;core
triste,sad,adjective,none,Le film est très triste.,The movie is very sad.,A1;core
fatigué / fatiguée,tired,adjective,none,Je suis fatigué ce soir.,I am tired this evening.,A1;core
malade,sick,adjective,none,Mon frère est malade.,My brother is sick.,A1;core
libre,free,adjective,none,Je suis libre demain.,I am free tomorrow.,A1;core
occupé / occupée,busy,adjective,none,Elle est très occupée.,She is very busy.,A1;core
vrai / vraie,true / real,adjective,none,C'est vrai.,It is true.,A1;core
gentil / gentille,kind / nice,adjective,none,Ma soeur est très gentille.,My sister is very kind.,A1;core
important / importante,important,adjective,none,C'est très important.,It is very important.,A2;core
possible,possible,adjective,none,Est-ce possible ?,Is it possible?,A2;core
autre,other / another,adjective,none,Je veux un autre café.,I want another coffee.,A1;core
chaque,each / every,determiner,none,Je lis chaque jour.,I read every day.,A1;core
quel / quelle,which / what,determiner,none,Quel livre veux-tu ?,Which book do you want?,A1;core
peut-être,maybe / perhaps,adverb,none,Peut-être demain.,Maybe tomorrow.,A1;core
souvent,often,adverb,none,Je mange souvent ici.,I often eat here.,A1;core
vite,quickly / fast,adverb,none,Il parle très vite.,He speaks very fast.,A1;core
longtemps,for a long time,adverb,none,Il dort longtemps le dimanche.,He sleeps for a long time on Sundays.,A2;core
ensemble,together,adverb,none,Nous voyageons ensemble.,We are traveling together.,A1;core
presque,almost,adverb,none,Il est presque midi.,It is almost noon.,A1;core
seulement,only,adverb,none,Je veux seulement un café.,I only want a coffee.,A1;core
assez,enough / quite,adverb,none,J'ai assez de pain.,I have enough bread.,A1;core
trop,too much / too many,adverb,none,Il y a trop de monde.,There are too many people.,A1;core
enfin,finally / at last,adverb,none,"Enfin, le week-end !","Finally, the weekend!",A1;core
ensuite,then / next,adverb,none,"Ensuite, nous mangeons.",Then we eat.,A1;core
tard,late,adverb,none,Il est tard.,It is late.,A1;core
tôt,early,adverb,none,Il arrive tôt le matin.,He arrives early in the morning.,A1;core
dehors,outside,adverb,none,Il fait froid dehors.,It is cold outside.,A1;core
donc,so / therefore,conjunction,none,"Il est tard, donc je rentre.","It is late, so I am going home.",A1;core
rien,nothing,pronoun,none,Je ne fais rien.,I am doing nothing.,A1;core
quelque chose,something,pronoun,none,Je veux quelque chose à boire.,I want something to drink.,A1;core
quelqu'un,someone,pronoun,none,Quelqu'un est à la porte.,Someone is at the door.,A1;core
combien,how much / how many,adverb,none,Combien ça coûte ?,How much does it cost?,A1;core
deux,two,number,none,J'ai deux chats.,I have two cats.,A1;core
trois,three,number,none,Il y a trois livres.,There are three books.,A1;core
quatre,four,number,none,Nous sommes quatre.,There are four of us.,A1;core
cinq,five,number,none,Il est cinq heures.,It is five o'clock.,A1;core
six,six,number,none,Il y a six personnes ici.,There are six people here.,A1;core
sept,seven,number,none,La semaine a sept jours.,The week has seven days.,A1;core
huit,eight,number,none,Il est huit heures.,It is eight o'clock.,A1;core
neuf,nine,number,none,Elle a neuf ans.,She is nine years old.,A1;core
dix,ten,number,none,J'ai dix euros.,I have ten euros.,A1;core
entendre,to hear,verb,none,J'entends un bruit dans la cuisine.,I hear a noise in the kitchen.,A1;core
tenir,to hold / to keep,verb,none,Je tiens ton sac.,I am holding your bag.,A2;core
devenir,to become,verb,none,Il veut devenir médecin.,He wants to become a doctor.,A2;core
revenir,to come back,verb,none,Je reviens demain.,I am coming back tomorrow.,A1;core
utiliser,to use,verb,none,Tu peux utiliser mon sac.,You can use my bag.,A1;core
essayer,to try,verb,none,J'essaie de parler français.,I am trying to speak French.,A1;core
continuer,to continue,verb,none,Nous continuons demain.,We are continuing tomorrow.,A1;core
arrêter,to stop,verb,none,Il arrête la musique.,He stops the music.,A2;core
expliquer,to explain,verb,none,Il explique la question.,He explains the question.,A2;core
préparer,to prepare,verb,none,Je prépare le repas.,I am preparing the meal.,A1;core
décider,to decide,verb,none,Nous décidons ensemble.,We decide together.,A2;core
raconter,to tell (a story),verb,none,Elle raconte une belle histoire.,She tells a lovely story.,A2;core
s'appeler,to be called (my name is...),verb,none,Je m'appelle Marie.,My name is Marie.,A1;core
se lever,to get up,verb,none,Je me lève à sept heures.,I get up at seven.,A1;core
le fromage,cheese,noun,m,J'aime le fromage français.,I like French cheese.,A1;core
la pomme,apple,noun,f,La pomme est rouge.,The apple is red.,A1;core
la viande,meat,noun,f,Je ne mange pas de viande.,I do not eat meat.,A1;core
le poisson,fish,noun,m,Le poisson est frais.,The fish is fresh.,A1;core
le lait,milk,noun,m,Je bois du lait le matin.,I drink milk in the morning.,A1;core
le sac,bag,noun,m,Où est mon sac ?,Where is my bag?,A1;core
la clé,key,noun,f,Je cherche ma clé.,I am looking for my key.,A1;core
la carte,card / map / menu,noun,f,Voici la carte du restaurant.,Here is the restaurant menu.,A1;core
la lettre,letter,noun,f,J'écris une lettre à ma soeur.,I am writing a letter to my sister.,A1;core
la mer,sea,noun,f,La mer est très belle.,The sea is very beautiful.,A1;core
la montagne,mountain,noun,f,Nous marchons dans la montagne.,We are walking in the mountains.,A1;core
la couleur,color,noun,f,Quelle est ta couleur préférée ?,What is your favorite color?,A2;core
le rendez-vous,appointment / meeting,noun,m,J'ai un rendez-vous demain.,I have an appointment tomorrow.,A1;core
le bruit,noise,noun,m,Il y a trop de bruit ici.,There is too much noise here.,A1;core
les vacances,vacation / holidays,noun,f,Nous sommes en vacances.,We are on vacation.,A1;core
rouge,red,adjective,none,La voiture est rouge.,The car is red.,A1;core
bleu / bleue,blue,adjective,none,Le ciel est bleu.,The sky is blue.,A1;core
blanc / blanche,white,adjective,none,Le chat est blanc.,The cat is white.,A1;core
noir / noire,black,adjective,none,Mon sac est noir.,My bag is black.,A1;core
vert / verte,green,adjective,none,La pomme est verte.,The apple is green.,A1;core
dernier / dernière,last,adjective,none,C'est le dernier train.,It is the last train.,A1;core
prochain / prochaine,next,adjective,none,À la prochaine !,See you next time!,A1;core
premier / première,first,adjective,none,C'est la première fois.,It is the first time.,A1;core
long / longue,long,adjective,none,La rue est longue.,The street is long.,A1;core
depuis,since / for,preposition,none,J'habite ici depuis un an.,I have lived here for a year.,A2;core
vers,toward / around,preposition,none,Je rentre vers six heures.,I go home around six o'clock.,A2;core
contre,against,preposition,none,Je suis contre cette idée.,I am against this idea.,A2;core
`
};
