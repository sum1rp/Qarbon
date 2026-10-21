// Qarbon's built-in word packs, as text in the same CSV format as the files in the project folder
// (beginner150.csv, level2-150.csv, level3.csv). They live in a script file so they also work offline and when
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
`,
  level3: `
front,back,part_of_speech,gender,example_target,example_english,tags
se souvenir de,to remember,verb,none,Je me souviens de ce jour.,I remember that day.,A2;daily
se réveiller,to wake up,verb,none,Je me réveille à sept heures.,I wake up at seven.,A2;daily
se coucher,to go to bed,verb,none,Elle se couche tard le samedi.,She goes to bed late on Saturdays.,A2;daily
s'habiller,to get dressed,verb,none,Je m'habille vite le matin.,I get dressed quickly in the morning.,A2;daily
se laver,to wash (oneself),verb,none,Les enfants se lavent les mains.,The children wash their hands.,A2;daily
se dépêcher,to hurry,verb,none,Dépêche-toi ! Le train part.,Hurry up! The train is leaving.,A2;daily
s'asseoir,to sit down,verb,none,Asseyez-vous ici.,Sit down here.,A2;daily
se promener,to go for a walk,verb,none,On se promène dans le parc.,We go for a walk in the park.,A2;daily
se reposer,to rest,verb,none,Tu dois te reposer un peu.,You should rest a little.,A2;health
s'amuser,to have fun,verb,none,Les enfants s'amusent dehors.,The children are having fun outside.,A2;feelings
s'occuper de,to take care of,verb,none,Je m'occupe de mon petit frère.,I take care of my little brother.,A2;daily
se tromper,to be wrong / to make a mistake,verb,none,"Pardon, je me suis trompé.","Sorry, I made a mistake.",A2;daily
se sentir,to feel,verb,none,Je ne me sens pas bien.,I don't feel well.,A2;health
se rendre compte,to realize,verb,none,Je me rends compte qu'il est tard.,I realize that it is late.,B1;mind
s'inquiéter,to worry,verb,none,Ne t'inquiète pas.,Don't worry.,A2;feelings
se marier,to get married,verb,none,Ils se marient en juin.,They are getting married in June.,A2;people
s'intéresser à,to be interested in,verb,none,Je m'intéresse à l'histoire.,I am interested in history.,B1;mind
se plaindre,to complain,verb,none,Il se plaint toujours du bruit.,He always complains about the noise.,B1;feelings
se taire,to be quiet,verb,none,Tais-toi et écoute.,Be quiet and listen.,B1;daily
se disputer,to argue,verb,none,Mes voisins se disputent souvent.,My neighbors often argue.,B1;people
se passer,to happen,verb,none,Qu'est-ce qui se passe ?,What's happening?,A2;daily
partager,to share,verb,none,On partage le gâteau ?,Shall we share the cake?,A2;people
permettre,to allow,verb,none,Ce billet permet d'entrer au musée.,This ticket lets you into the museum.,B1;society
promettre,to promise,verb,none,Je te promets de venir.,I promise you I will come.,A2;people
proposer,to suggest / to offer,verb,none,Je propose d'aller au cinéma.,I suggest going to the cinema.,A2;people
refuser,to refuse,verb,none,Il refuse de répondre.,He refuses to answer.,A2;people
accepter,to accept,verb,none,J'accepte ton invitation.,I accept your invitation.,A2;people
réussir,to succeed / to pass,verb,none,Elle a réussi son examen.,She passed her exam.,A2;work
échouer,to fail,verb,none,Il a échoué à l'examen.,He failed the exam.,B1;work
améliorer,to improve,verb,none,Je veux améliorer mon français.,I want to improve my French.,B1;work
apprécier,to appreciate / to enjoy,verb,none,J'apprécie ton aide.,I appreciate your help.,B1;feelings
éviter,to avoid,verb,none,Évite cette rue le soir.,Avoid this street in the evening.,B1;city
empêcher,to prevent,verb,none,Le bruit m'empêche de dormir.,The noise keeps me from sleeping.,B1;daily
espérer,to hope,verb,none,J'espère que tu vas bien.,I hope you are well.,A2;feelings
rêver,to dream,verb,none,Je rêve de voir Paris.,I dream of seeing Paris.,A2;feelings
sembler,to seem,verb,none,Tu sembles fatigué.,You seem tired.,B1;mind
mériter,to deserve,verb,none,Tu mérites des vacances.,You deserve a vacation.,B1;feelings
oser,to dare,verb,none,Je n'ose pas lui parler.,I don't dare talk to him.,B1;feelings
compter,to count / to matter,verb,none,Ton avis compte pour moi.,Your opinion matters to me.,A2;mind
conduire,to drive,verb,none,Je conduis pour aller au travail.,I drive to work.,A2;travel
construire,to build,verb,none,Ils construisent une maison.,They are building a house.,B1;home
réparer,to repair,verb,none,Mon père répare le vélo.,My father is repairing the bike.,A2;home
nettoyer,to clean,verb,none,Je nettoie la cuisine.,I am cleaning the kitchen.,A2;home
ranger,to tidy up / to put away,verb,none,Range ta chambre !,Tidy your room!,A2;home
laver,to wash,verb,none,Je lave la voiture.,I am washing the car.,A2;home
cuisiner,to cook,verb,none,Il aime cuisiner pour ses amis.,He likes cooking for his friends.,A2;food
goûter,to taste,verb,none,Goûte cette soupe.,Taste this soup.,A2;food
couper,to cut,verb,none,"Coupe le pain, s'il te plaît.","Cut the bread, please.",A2;food
allumer,to turn on / to light,verb,none,Allume la lumière.,Turn on the light.,A2;home
éteindre,to turn off,verb,none,N'oublie pas d'éteindre la télé.,Don't forget to turn off the TV.,A2;home
monter,to go up / to get on,verb,none,Nous montons au troisième étage.,We are going up to the third floor.,A2;city
descendre,to go down / to get off,verb,none,Je descends du bus ici.,I get off the bus here.,A2;travel
traverser,to cross,verb,none,Traverse la rue au feu.,Cross the street at the light.,A2;city
tourner,to turn,verb,none,Tournez à gauche après le pont.,Turn left after the bridge.,A2;city
quitter,to leave (a place or someone),verb,none,Elle quitte le bureau à six heures.,She leaves the office at six.,A2;work
rejoindre,to join / to meet up with,verb,none,Je te rejoins au café.,I'll meet you at the café.,B1;people
emprunter,to borrow,verb,none,Je peux emprunter ton stylo ?,Can I borrow your pen?,A2;daily
prêter,to lend,verb,none,Il me prête sa voiture.,He lends me his car.,A2;daily
vendre,to sell,verb,none,Ils vendent leur appartement.,They are selling their apartment.,A2;shopping
louer,to rent,verb,none,On loue un vélo pour la journée.,We are renting a bike for the day.,A2;travel
dépenser,to spend (money),verb,none,J'ai trop dépensé ce mois-ci.,I spent too much this month.,A2;shopping
coûter,to cost,verb,none,Combien coûte ce manteau ?,How much does this coat cost?,A2;shopping
apporter,to bring,verb,none,Apporte une bouteille de vin.,Bring a bottle of wine.,A2;food
garder,to keep,verb,none,Gardez la monnaie.,Keep the change.,A2;shopping
cacher,to hide,verb,none,Le chat se cache sous le lit.,The cat is hiding under the bed.,A2;home
jeter,to throw (away),verb,none,Ne jette pas ce papier par terre.,Don't throw this paper on the ground.,A2;home
toucher,to touch,verb,none,Ne touche pas le four !,Don't touch the oven!,A2;home
tirer,to pull,verb,none,Tirez la porte pour ouvrir.,Pull the door to open it.,A2;daily
pousser,to push / to grow,verb,none,Poussez la porte.,Push the door.,A2;daily
courir,to run,verb,none,Je cours tous les matins.,I run every morning.,A2;health
nager,to swim,verb,none,Nous nageons dans le lac.,We swim in the lake.,A2;nature
danser,to dance,verb,none,Tu veux danser ?,Do you want to dance?,A2;free time
chanter,to sing,verb,none,Elle chante très bien.,She sings very well.,A2;free time
dessiner,to draw,verb,none,Mon fils dessine un arbre.,My son is drawing a tree.,A2;free time
rire,to laugh,verb,none,On a beaucoup ri ce soir.,We laughed a lot tonight.,A2;feelings
sourire,to smile,verb,none,Elle sourit tout le temps.,She smiles all the time.,A2;feelings
pleurer,to cry,verb,none,Le bébé pleure.,The baby is crying.,A2;feelings
crier,to shout,verb,none,Ne crie pas !,Don't shout!,A2;feelings
remercier,to thank,verb,none,Je te remercie pour le cadeau.,Thank you for the gift.,A2;people
s'excuser,to apologize,verb,none,Il s'excuse pour son retard.,He apologizes for being late.,A2;people
pardonner,to forgive,verb,none,Je te pardonne.,I forgive you.,B1;feelings
inviter,to invite,verb,none,Je t'invite à dîner.,I'm inviting you to dinner.,A2;people
discuter,to discuss / to chat,verb,none,On discute de nos projets.,We are discussing our plans.,A2;people
convaincre,to convince,verb,none,Tu m'as convaincu.,You convinced me.,B1;mind
prévenir,to warn / to let know,verb,none,Préviens-moi si tu es en retard.,Let me know if you're late.,B1;people
prévoir,to plan / to forecast,verb,none,La météo prévoit de la pluie.,The forecast calls for rain.,B1;nature
décrire,to describe,verb,none,Décris-moi ta maison.,Describe your house to me.,A2;mind
traduire,to translate,verb,none,Tu peux traduire cette phrase ?,Can you translate this sentence?,A2;work
répéter,to repeat,verb,none,"Vous pouvez répéter, s'il vous plaît ?","Can you repeat that, please?",A2;work
deviner,to guess,verb,none,Devine qui est là !,Guess who's here!,A2;mind
imaginer,to imagine,verb,none,Imagine une ville sans voitures.,Imagine a city without cars.,B1;mind
remarquer,to notice,verb,none,Tu as remarqué son nouveau sac ?,Did you notice her new bag?,B1;mind
reconnaître,to recognize,verb,none,Je ne t'ai pas reconnu !,I didn't recognize you!,B1;mind
découvrir,to discover,verb,none,J'ai découvert un petit restaurant.,I discovered a little restaurant.,B1;travel
ressembler à,to look like,verb,none,Tu ressembles à ta mère.,You look like your mother.,A2;people
dépendre de,to depend on,verb,none,Ça dépend du temps.,It depends on the weather.,B1;mind
manquer,to miss / to be missing,verb,none,Tu me manques.,I miss you.,B1;feelings
guérir,to heal / to get better,verb,none,Il a guéri très vite.,He got better very quickly.,B1;health
mourir,to die,verb,none,Sa grand-mère est morte l'an dernier.,Her grandmother died last year.,A2;people
naître,to be born,verb,none,Je suis né en 2001.,I was born in 2001.,A2;people
grandir,to grow up,verb,none,J'ai grandi à la campagne.,I grew up in the countryside.,A2;people
changer,to change,verb,none,Le temps change vite ici.,The weather changes fast here.,A2;nature
durer,to last,verb,none,Le film dure deux heures.,The movie lasts two hours.,A2;time
l'appartement,apartment,noun,m,Notre appartement est petit mais clair.,Our apartment is small but bright.,A2;home
l'étage,floor (of a building),noun,m,J'habite au deuxième étage.,I live on the second floor.,A2;home
l'escalier,stairs,noun,m,Prends l'escalier.,Take the stairs.,A2;home
la salle de bains,bathroom,noun,f,La salle de bains est à droite.,The bathroom is on the right.,A2;home
le lit,bed,noun,m,Le lit est très confortable.,The bed is very comfortable.,A2;home
le canapé,sofa,noun,m,Le chat dort sur le canapé.,The cat sleeps on the sofa.,A2;home
le frigo,fridge,noun,m,Il n'y a plus de lait dans le frigo.,There's no more milk in the fridge.,A2;home
le four,oven,noun,m,Le gâteau est dans le four.,The cake is in the oven.,A2;home
la lumière,light,noun,f,Il y a beaucoup de lumière ici.,There is a lot of light here.,A2;home
le mur,wall,noun,m,Il y a une photo sur le mur.,There is a photo on the wall.,A2;home
le voisin / la voisine,neighbor,noun,m/f,Notre voisine est très gentille.,Our neighbor is very kind.,A2;home
le quartier,neighborhood,noun,m,J'aime bien ce quartier.,I really like this neighborhood.,A2;city
le pont,bridge,noun,m,On traverse le pont à pied.,We cross the bridge on foot.,A2;city
le parc,park,noun,m,Les enfants jouent au parc.,The children are playing in the park.,A2;city
la banque,bank,noun,f,La banque ferme à cinq heures.,The bank closes at five.,A2;city
la pharmacie,pharmacy,noun,f,Il y a une pharmacie au coin.,There is a pharmacy on the corner.,A2;city
la boulangerie,bakery,noun,f,Je vais à la boulangerie chercher du pain.,I'm going to the bakery to get bread.,A2;city
la bibliothèque,library,noun,f,J'étudie à la bibliothèque.,I study at the library.,A2;city
le musée,museum,noun,m,Le musée est gratuit le dimanche.,The museum is free on Sundays.,A2;city
l'hôpital,hospital,noun,m,Elle travaille à l'hôpital.,She works at the hospital.,A2;city
la poste,post office,noun,f,J'envoie un colis à la poste.,I'm sending a package at the post office.,A2;city
le feu,traffic light / fire,noun,m,Le feu est rouge.,The light is red.,A2;city
l'église,church,noun,f,L'église est très ancienne.,The church is very old.,A2;city
l'avion,plane,noun,m,L'avion part à midi.,The plane leaves at noon.,A2;travel
le bus,bus,noun,m,Je prends le bus pour aller en ville.,I take the bus into town.,A2;travel
le métro,subway,noun,m,Le métro est plus rapide.,The subway is faster.,A2;travel
le vélo,bike,noun,m,Je vais au travail à vélo.,I go to work by bike.,A2;travel
la route,road,noun,f,La route est longue.,The road is long.,A2;travel
l'aéroport,airport,noun,m,On arrive à l'aéroport à six heures.,We arrive at the airport at six.,A2;travel
le passeport,passport,noun,m,N'oublie pas ton passeport.,Don't forget your passport.,A2;travel
la valise,suitcase,noun,f,Ma valise est trop lourde.,My suitcase is too heavy.,A2;travel
l'hôtel,hotel,noun,m,L'hôtel est près de la gare.,The hotel is near the station.,A2;travel
la plage,beach,noun,f,On va à la plage cet après-midi.,We're going to the beach this afternoon.,A2;travel
le retard,delay,noun,m,Le train a une heure de retard.,The train is an hour late.,A2;travel
l'entreprise,company,noun,f,Elle travaille dans une grande entreprise.,She works at a big company.,A2;work
le / la collègue,colleague,noun,m/f,Mon collègue est en vacances.,My colleague is on vacation.,A2;work
la réunion,meeting,noun,f,La réunion commence à dix heures.,The meeting starts at ten.,A2;work
le salaire,salary,noun,m,Il a un bon salaire.,He has a good salary.,B1;work
le métier,job / trade,noun,m,Quel est ton métier ?,What do you do for a living?,A2;work
le projet,project / plan,noun,m,J'ai un nouveau projet.,I have a new project.,A2;work
le cours,class / lesson,noun,m,Le cours de français est le mardi.,French class is on Tuesdays.,A2;work
l'examen,exam,noun,m,L'examen est demain.,The exam is tomorrow.,A2;work
les devoirs,homework,noun,m,Tu as fini tes devoirs ?,Did you finish your homework?,A2;work
l'étudiant / l'étudiante,student,noun,m/f,Les étudiants sont dans la classe.,The students are in the classroom.,A2;work
le courriel,email,noun,m,Je t'envoie un courriel ce soir.,I'll send you an email tonight.,A2;work
le corps,body,noun,m,Le sport est bon pour le corps.,Sport is good for the body.,A2;health
le cœur,heart,noun,m,Mon cœur bat vite.,My heart is beating fast.,A2;health
le dos,back,noun,m,J'ai mal au dos.,My back hurts.,A2;health
le bras,arm,noun,m,Il s'est cassé le bras.,He broke his arm.,A2;health
la jambe,leg,noun,f,J'ai mal à la jambe.,My leg hurts.,A2;health
le pied,foot,noun,m,On y va à pied.,We're going on foot.,A2;health
l'œil / les yeux,eye / eyes,noun,m,Elle a les yeux bleus.,She has blue eyes.,A2;health
la bouche,mouth,noun,f,Ne parle pas la bouche pleine.,Don't talk with your mouth full.,A2;health
la dent,tooth,noun,f,Je me brosse les dents.,I brush my teeth.,A2;health
la santé,health,noun,f,La santé est importante.,Health is important.,A2;health
le rhume,cold (illness),noun,m,J'ai un rhume.,I have a cold.,A2;health
la fièvre,fever,noun,f,Il a de la fièvre.,He has a fever.,A2;health
le médicament,medicine,noun,m,Prends ce médicament deux fois par jour.,Take this medicine twice a day.,A2;health
la peur,fear,noun,f,J'ai peur du noir.,I'm afraid of the dark.,A2;feelings
la joie,joy,noun,f,Quelle joie de te voir !,What a joy to see you!,B1;feelings
la colère,anger,noun,f,Il est en colère.,He is angry.,B1;feelings
l'amour,love,noun,m,L'amour est aveugle.,Love is blind.,A2;feelings
l'espoir,hope,noun,m,Il ne faut pas perdre espoir.,You must not lose hope.,B1;feelings
le souvenir,memory / souvenir,noun,m,C'est un bon souvenir.,It's a good memory.,A2;feelings
le rêve,dream,noun,m,J'ai fait un rêve bizarre.,I had a strange dream.,A2;feelings
le bonheur,happiness,noun,m,L'argent ne fait pas le bonheur.,Money doesn't buy happiness.,B1;feelings
la confiance,trust / confidence,noun,f,J'ai confiance en toi.,I trust you.,B1;feelings
l'amitié,friendship,noun,f,Notre amitié est importante pour moi.,Our friendship is important to me.,B1;feelings
le mari,husband,noun,m,Son mari est médecin.,Her husband is a doctor.,A2;people
le fils,son,noun,m,Leur fils a dix ans.,Their son is ten.,A2;people
l'oncle,uncle,noun,m,Mon oncle habite à Lyon.,My uncle lives in Lyon.,A2;people
la tante,aunt,noun,f,Ma tante vient dîner ce soir.,My aunt is coming to dinner tonight.,A2;people
le cousin / la cousine,cousin,noun,m/f,Ma cousine est étudiante.,My cousin is a student.,A2;people
les grands-parents,grandparents,noun,m,Je vais chez mes grands-parents.,I'm going to my grandparents' house.,A2;people
le ciel,sky,noun,m,Le ciel est bleu aujourd'hui.,The sky is blue today.,A2;nature
l'arbre,tree,noun,m,Il y a un grand arbre dans le jardin.,There is a big tree in the garden.,A2;nature
la fleur,flower,noun,f,Ces fleurs sentent bon.,These flowers smell good.,A2;nature
la forêt,forest,noun,f,On se promène dans la forêt.,We walk in the forest.,A2;nature
le lac,lake,noun,m,Le lac est froid.,The lake is cold.,A2;nature
la rivière,river,noun,f,La rivière passe près du village.,The river runs near the village.,A2;nature
le vent,wind,noun,m,Il y a du vent ce matin.,It's windy this morning.,A2;nature
la neige,snow,noun,f,Les enfants jouent dans la neige.,The children are playing in the snow.,A2;nature
le nuage,cloud,noun,m,Il n'y a pas un nuage.,There isn't a cloud.,A2;nature
l'oiseau,bird,noun,m,Un oiseau chante dans l'arbre.,A bird is singing in the tree.,A2;nature
la campagne,countryside,noun,f,Ils habitent à la campagne.,They live in the countryside.,A2;nature
l'hiver,winter,noun,m,L'hiver est long ici.,Winter is long here.,A2;time
l'été,summer,noun,m,On part en vacances en été.,We go on vacation in the summer.,A2;time
le siècle,century,noun,m,Ce château date du seizième siècle.,This castle dates from the sixteenth century.,B1;time
le moment,moment,noun,m,Attends un moment.,Wait a moment.,A2;time
l'avenir,future,noun,m,Personne ne connaît l'avenir.,Nobody knows the future.,B1;time
le week-end,weekend,noun,m,Qu'est-ce que tu fais ce week-end ?,What are you doing this weekend?,A2;time
l'anniversaire,birthday,noun,m,Bon anniversaire !,Happy birthday!,A2;time
la fête,party / holiday,noun,f,On fait une fête samedi.,We're having a party on Saturday.,A2;time
le début,beginning,noun,m,Le début du livre est lent.,The beginning of the book is slow.,A2;time
le légume,vegetable,noun,m,Mange tes légumes.,Eat your vegetables.,A2;food
le poulet,chicken,noun,m,On mange du poulet ce soir.,We're eating chicken tonight.,A2;food
l'œuf,egg,noun,m,Je voudrais deux œufs.,I'd like two eggs.,A2;food
le sucre,sugar,noun,m,Tu prends du sucre dans ton café ?,Do you take sugar in your coffee?,A2;food
le gâteau,cake,noun,m,Ce gâteau au chocolat est délicieux.,This chocolate cake is delicious.,A2;food
le petit-déjeuner,breakfast,noun,m,Le petit-déjeuner est prêt.,Breakfast is ready.,A2;food
le dîner,dinner,noun,m,Le dîner est à huit heures.,Dinner is at eight.,A2;food
le verre,glass,noun,m,Un verre d'eau s'il vous plaît.,A glass of water please.,A2;food
la bouteille,bottle,noun,f,Une bouteille de vin rouge.,A bottle of red wine.,A2;food
la chaussure,shoe,noun,f,J'ai besoin de nouvelles chaussures.,I need new shoes.,A2;shopping
le manteau,coat,noun,m,Mets ton manteau. Il fait froid.,Put on your coat. It's cold.,A2;shopping
la raison,reason,noun,f,Pour quelle raison ?,For what reason?,B1;mind
le choix,choice,noun,m,Tu n'as pas le choix.,You don't have a choice.,B1;mind
l'avis,opinion,noun,m,À mon avis c'est une bonne idée.,In my opinion it's a good idea.,B1;mind
la vérité,truth,noun,f,Dis-moi la vérité.,Tell me the truth.,B1;mind
le mensonge,lie,noun,m,C'est un mensonge !,That's a lie!,B1;mind
la chance,luck / chance,noun,f,Bonne chance pour ton examen !,Good luck on your exam!,A2;mind
le danger,danger,noun,m,Attention : danger !,Watch out: danger!,B1;society
la guerre,war,noun,f,Mon grand-père a fait la guerre.,My grandfather fought in the war.,B1;society
la paix,peace,noun,f,Laisse-moi en paix.,Leave me in peace.,B1;society
l'erreur,mistake,noun,f,Tout le monde fait des erreurs.,Everyone makes mistakes.,A2;mind
le conseil,piece of advice,noun,m,Je peux te donner un conseil ?,Can I give you some advice?,B1;mind
fort / forte,strong / loud,adjective,none,Il est très fort en maths.,He's very good at math.,A2;describe
faible,weak,adjective,none,Je me sens faible.,I feel weak.,B1;describe
riche,rich,adjective,none,Ils sont très riches.,They are very rich.,A2;describe
pauvre,poor,adjective,none,Le pauvre chat a faim.,The poor cat is hungry.,A2;describe
propre,clean / own,adjective,none,La cuisine est propre.,The kitchen is clean.,A2;home
sale,dirty,adjective,none,Tes chaussures sont sales.,Your shoes are dirty.,A2;home
plein / pleine,full,adjective,none,Le bus est plein.,The bus is full.,A2;describe
vide,empty,adjective,none,Le frigo est vide.,The fridge is empty.,A2;describe
lourd / lourde,heavy,adjective,none,Ce sac est lourd.,This bag is heavy.,A2;describe
léger / légère,light (not heavy),adjective,none,Ma valise est légère.,My suitcase is light.,A2;describe
doux / douce,soft / gentle / mild,adjective,none,Il fait doux aujourd'hui.,It's mild today.,B1;describe
dur / dure,hard,adjective,none,Ce pain est dur.,This bread is hard.,A2;describe
sûr / sûre,sure / safe,adjective,none,Tu es sûr ?,Are you sure?,A2;mind
dangereux / dangereuse,dangerous,adjective,none,Cette route est dangereuse.,This road is dangerous.,A2;describe
calme,calm / quiet,adjective,none,Le quartier est calme.,The neighborhood is quiet.,A2;describe
drôle,funny,adjective,none,Ton frère est drôle.,Your brother is funny.,A2;people
sérieux / sérieuse,serious,adjective,none,C'est un étudiant sérieux.,He's a serious student.,A2;people
sympa,nice / friendly,adjective,none,Tes amis sont sympas.,Your friends are nice.,A2;people
méchant / méchante,mean / nasty,adjective,none,Ne sois pas méchant.,Don't be mean.,A2;people
poli / polie,polite,adjective,none,Il est toujours poli.,He is always polite.,A2;people
timide,shy,adjective,none,Ma fille est un peu timide.,My daughter is a little shy.,A2;people
fier / fière,proud,adjective,none,Je suis fier de toi.,I'm proud of you.,B1;feelings
jaloux / jalouse,jealous,adjective,none,Il est jaloux de son frère.,He is jealous of his brother.,B1;feelings
inquiet / inquiète,worried,adjective,none,Ta mère est inquiète.,Your mother is worried.,B1;feelings
surpris / surprise,surprised,adjective,none,Je suis surpris de te voir ici.,I'm surprised to see you here.,B1;feelings
déçu / déçue,disappointed,adjective,none,Elle est déçue du résultat.,She is disappointed with the result.,B1;feelings
fâché / fâchée,angry / upset,adjective,none,Tu es fâché contre moi ?,Are you angry with me?,B1;feelings
célèbre,famous,adjective,none,C'est un acteur célèbre.,He's a famous actor.,A2;describe
étrange,strange,adjective,none,C'est une histoire étrange.,It's a strange story.,B1;describe
simple,simple / easy,adjective,none,La recette est simple.,The recipe is simple.,A2;describe
utile,useful,adjective,none,Ce livre est très utile.,This book is very useful.,A2;describe
pratique,practical / handy,adjective,none,Le métro est pratique.,The subway is handy.,A2;describe
ancien / ancienne,old / former,adjective,none,C'est mon ancien professeur.,He's my former teacher.,B1;describe
moderne,modern,adjective,none,Leur cuisine est très moderne.,Their kitchen is very modern.,A2;describe
rapide,fast,adjective,none,Ce train est rapide.,This train is fast.,A2;describe
lent / lente,slow,adjective,none,Internet est lent aujourd'hui.,The internet is slow today.,A2;describe
court / courte,short,adjective,none,Le film est court.,The movie is short.,A2;describe
joli / jolie,pretty,adjective,none,Quelle jolie robe !,What a pretty dress!,A2;describe
mauvais / mauvaise,bad,adjective,none,Il fait mauvais aujourd'hui.,The weather is bad today.,A2;describe
meilleur / meilleure,better / best,adjective,none,C'est mon meilleur ami.,He's my best friend.,A2;describe
différent / différente,different,adjective,none,Les deux villes sont très différentes.,The two cities are very different.,A2;describe
agréable,pleasant,adjective,none,Il fait un temps agréable.,The weather is pleasant.,A2;describe
intéressant / intéressante,interesting,adjective,none,Ce livre est intéressant.,This book is interesting.,A2;describe
ennuyeux / ennuyeuse,boring,adjective,none,Le cours était ennuyeux.,The class was boring.,A2;describe
tranquille,quiet / peaceful,adjective,none,Laisse-moi tranquille !,Leave me alone!,B1;describe
pourtant,yet / however,adverb,none,Il est riche et pourtant pas heureux.,He's rich and yet not happy.,B1;linking
d'ailleurs,besides / by the way,adverb,none,D'ailleurs je n'ai pas le temps.,Besides I don't have time.,B1;linking
cependant,however,adverb,none,C'est cher. Cependant c'est bien fait.,It's expensive. However it's well made.,B1;linking
en fait,actually / in fact,adverb,none,En fait je préfère le thé.,Actually I prefer tea.,A2;linking
au moins,at least,adverb,none,Il y a au moins vingt personnes.,There are at least twenty people.,A2;linking
plutôt,rather / quite,adverb,none,Le film est plutôt bon.,The movie is quite good.,B1;linking
surtout,especially / above all,adverb,none,J'aime les fruits et surtout les fraises.,I like fruit and especially strawberries.,A2;linking
environ,about / around,adverb,none,Ça coûte environ dix euros.,It costs about ten euros.,A2;linking
vraiment,really,adverb,none,C'est vraiment beau.,It's really beautiful.,A2;linking
à peine,barely / hardly,adverb,none,Je le connais à peine.,I barely know him.,B1;linking
autrefois,in the past / formerly,adverb,none,Autrefois il y avait une école ici.,There used to be a school here.,B1;time
bientôt,soon,adverb,none,À bientôt !,See you soon!,A2;time
parfois,sometimes,adverb,none,Parfois je travaille le samedi.,Sometimes I work on Saturdays.,A2;time
d'abord,first (of all),adverb,none,D'abord on mange. Ensuite on sort.,First we eat. Then we go out.,A2;linking
puis,then,adverb,none,Il a mangé puis il est parti.,He ate and then he left.,A2;linking
tout de suite,right away,adverb,none,J'arrive tout de suite.,I'm coming right away.,A2;time
quand même,anyway / still,adverb,none,Il pleut mais on sort quand même.,It's raining but we're going out anyway.,B1;linking
partout,everywhere,adverb,none,Je t'ai cherché partout.,I looked everywhere for you.,A2;linking
de temps en temps,from time to time,adverb,none,On se voit de temps en temps.,We see each other from time to time.,A2;time
grâce à,thanks to,preposition,none,J'ai réussi grâce à toi.,I succeeded thanks to you.,B1;linking
à cause de,because of,preposition,none,Le train est en retard à cause de la neige.,The train is late because of the snow.,A2;linking
malgré,despite,preposition,none,On est sortis malgré la pluie.,We went out despite the rain.,B1;linking
sauf,except,preposition,none,Tout le monde est venu sauf Paul.,Everyone came except Paul.,A2;linking
selon,according to,preposition,none,Selon la météo il va pleuvoir.,According to the forecast it's going to rain.,B1;linking
lorsque,when,conjunction,none,Lorsque j'étais petit j'avais un chien.,When I was little I had a dog.,B1;linking
puisque,since (because),conjunction,none,Puisque tu es là tu peux m'aider.,Since you're here you can help me.,B1;linking
pendant que,while,conjunction,none,Je lis pendant que tu cuisines.,I read while you cook.,A2;linking
dès que,as soon as,conjunction,none,Appelle-moi dès que tu arrives.,Call me as soon as you arrive.,B1;linking
avoir envie de,to feel like / to want,expression,none,J'ai envie d'une glace.,I feel like having an ice cream.,A2;expressions
avoir besoin de,to need,expression,none,J'ai besoin de ton aide.,I need your help.,A2;expressions
avoir peur de,to be afraid of,expression,none,Elle a peur des chiens.,She's afraid of dogs.,A2;expressions
avoir raison,to be right,expression,none,Tu as tout à fait raison.,You're absolutely right.,A2;expressions
avoir tort,to be wrong,expression,none,J'avais tort.,I was wrong.,A2;expressions
faire attention,to pay attention / to be careful,expression,none,Fais attention aux voitures !,Watch out for the cars!,A2;expressions
il vaut mieux,it's better to,expression,none,Il vaut mieux partir tôt.,It's better to leave early.,B1;expressions
tout le monde,everyone,pronoun,none,Tout le monde est là.,Everyone is here.,A2;expressions
`
};
