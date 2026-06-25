/* eslint-disable */
/**
 * Per-language step bodies for the help center: intro, steps[] and tip for each
 * use case, keyed by locale then by use-case slug.
 *
 * Consumed by scripts/generate-help-locales.mjs. Any use case missing for a
 * language falls back to the English body, so this file can grow incrementally
 * without breaking key parity. English itself lives in the locale generator.
 *
 * Keep slugs in sync with src/data/helpUseCases.ts.
 */
export const bodies = {
  sk: {
    'explore-assets': {
      intro:
        'Stránka Preskúmať aktíva je domovskou stránkou Biatec DEX. Agreguje každé aktívum, ktoré sa nachádza v poole likvidity, takže si pred obchodovaním alebo poskytovaním likvidity môžete prezrieť celkovú uzamknutú hodnotu (TVL), aktuálne ceny a počet poolov za každým tokenom.',
      steps: [
        'Otvorte Preskúmať z hornej ponuky (je to aj úvodná stránka na /).',
        'Pomocou vyhľadávacieho poľa filtrujte tabuľku podľa názvu, symbolu alebo ID aktíva.',
        'Prečítajte si súhrnné karty pre celkové TVL, počet poolov a počet zaradených aktív.',
        'Zoraďte ľubovoľný stĺpec - napríklad podľa celkového TVL alebo objemu za 24 h - a nájdite najaktívnejšie trhy.',
        'Pomocou akcií v riadku prejdite priamo na obchodovanie, pridanie alebo odobratie likvidity pre aktívum.'
      ],
      tip: 'Stĺpce ako VWAP 1D/7D a Poplatky 1D/7D vám pomôžu posúdiť, či je trh likvidný a koľko príjmu z poplatkov jeho pooly generujú.'
    },
    'find-asset-by-id': {
      intro:
        'Každé aktívum Algorand má jedinečné číselné ID. Keď je názov tokenu nejednoznačný - alebo nedostupný v aktuálnej sieti - môžete ho presne nájsť podľa jeho presného ID aktíva (ASA).',
      steps: [
        'Otvorte Preskúmať aktíva, Opt-in alebo Vytvoriť pool - všetky podporujú vyhľadávanie podľa ID.',
        'Do vyhľadávacieho poľa zadajte presné číselné ID aktíva.',
        'V sieťach, kde index aktív nie je dostupný, je na pridanie potrebné zadať presné ASA ID.',
        'Pred pokračovaním si overte názov a symbol nájdeného aktíva.',
        'Pokračujte obchodovaním, opt-in alebo pridaním do poolu.'
      ],
      tip: 'ID aktív sú najbezpečnejší spôsob identifikácie tokenu - názvy a symboly môžu kopírovať podvodné tokeny, ale ID je jedinečné.'
    },
    'connect-wallet': {
      intro:
        'Biatec DEX je plne samoúschovný - pripojenie peňaženky iba dokazuje, že ovládate adresu Algorand, a umožňuje vám podpisovať transakcie. DEX nikdy nedrží vaše aktíva.',
      steps: [
        'Kliknite na Prihlásiť sa vpravo hore v hlavičke.',
        'Vyberte si peňaženku - podporované sú Pera, Defly, Lute, WalletConnect a ďalšie.',
        'Alebo použite e-mail a heslo ARC-76 na odvodenie účtu Algorand v prehliadači.',
        'Schváľte žiadosť o overenie ARC-14, aby aplikácia overila, že adresu vlastníte.',
        'Po pripojení sa v hlavičke zobrazí vaša skrátená adresa; kliknutím skopírujete celú adresu.'
      ],
      tip: 'Pre najvyššiu bezpečnosť použite multisig účet s hardvérovými podpisovačmi; možnosť e-mail/heslo je najrýchlejšia, ale najmenej bezpečná.'
    },
    'switch-language': {
      intro:
        'Celé rozhranie je preložené do desiatich jazykov. Vaša voľba sa uloží v prehliadači, takže sa aplikácia nabudúce otvorí v rovnakom jazyku.',
      steps: [
        'Otvorte ponuku nastavení (ozubené koleso) v hlavičke.',
        'Rozbaľte sekciu Jazyk.',
        'Vyberte si jazyk zo zoznamu - aktívny je označený fajkou.',
        'Rozhranie sa okamžite aktualizuje bez obnovenia stránky.'
      ],
      tip: 'Aplikácia sa pri prvej návšteve pokúsi zhodovať s jazykom vášho prehliadača, než sa vráti k angličtine.'
    },
    'switch-theme': {
      intro:
        'Biatec DEX ponúka svetlý a tmavý motív. Vaša preferencia sa zapamätá medzi návštevami.',
      steps: [
        'Nájdite tlačidlo slnko/mesiac v hlavičke vedľa tlačidla Prihlásiť sa alebo čipu účtu.',
        'Kliknutím prepnete medzi svetlým a tmavým režimom.',
        'Okolité pozadie a každý komponent sa okamžite prefarbia.'
      ],
      tip: 'Vaša voľba motívu sa uloží lokálne, takže sa aplikácia otvorí vo vami preferovanom režime.'
    },
    'trade-screen': {
      intro:
        'Obchodná obrazovka spája všetko, čo potrebujete na obchodovanie jedného aktíva voči druhému: cenový graf, hĺbku trhu, posledné obchody a panel na zadávanie príkazov. Pár je zakódovaný v URL, takže každé zobrazenie možno zdieľať.',
      steps: [
        'Otvorte pár cez Preskúmať a potom Swap, alebo prejdite na /trade/<sieť>/<aktívum>/<mena>.',
        'Pomocou výberov aktíva a meny zmeňte ktorúkoľvek stranu páru.',
        'Sledujte cenový graf a panel informácií o aktíve pre najnovšiu cenu a objem.',
        'Prečítajte si hĺbku trhu a posledné obchody na posúdenie likvidity.',
        'Zadajte nákupný alebo predajný príkaz v paneli trhových príkazov vpravo.'
      ],
      tip: 'Ceny sa vždy zobrazujú ako Aktívum/Mena (napríklad GD/USD); prehodenie poradia páru invertuje kotáciu.'
    },
    'buy-order': {
      intro:
        'Nákupný trhový príkaz minie vašu kótovaciu menu na získanie základného aktíva. Príkazy sa smerujú cez agregátor Folks Router a pooly Biatec CLAMM, aby sa našlo najlepšie vykonanie.',
      steps: [
        'Na obchodnej obrazovke vyberte kartu Nákup v paneli trhových príkazov.',
        'Zadajte množstvo aktíva, ktoré chcete kúpiť.',
        'Skontrolujte živú kotáciu vrátane slippage v bázických bodoch.',
        'Uistite sa, že ste overení a opt-in na aktívum.',
        'Kliknite na Kúpiť a schváľte transakciu v peňaženke.'
      ],
      tip: 'Ak sa kotácia pohne nad váš nastavený slippage, príkaz sa zamietne na vašu ochranu - slippage v Nastaveniach zvýšte len ak akceptujete horšiu cenu.'
    },
    'sell-order': {
      intro:
        'Predajný trhový príkaz prevedie základné aktívum späť na kótovaciu menu. Podobne ako nákupy sa predaje smerujú cez agregátor a pooly CLAMM pre najlepšiu cenu.',
      steps: [
        'Na obchodnej obrazovke vyberte kartu Predaj v paneli trhových príkazov.',
        'Zadajte množstvo aktíva, ktoré chcete predať.',
        'Pred potvrdením skontrolujte kotáciu a zobrazený slippage.',
        'Potvrďte, že ste overení a aktívum vlastníte.',
        'Kliknite na Predať a schváľte transakciu v peňaženke.'
      ],
      tip: 'Najprv sledujte posledné obchody a hĺbku trhu - predaj do tenkej likvidity pohne cenou viac a zvýši slippage.'
    },
    'market-depth': {
      intro:
        'Panel hĺbky trhu zobrazuje agregované nákupy a ponuky okolo strednej ceny, takže vidíte, aký objem dokáže trh absorbovať skôr, než sa cena pohne.',
      steps: [
        'Otvorte ľubovoľný obchodný pár.',
        'Nájdite panel Hĺbka trhu.',
        'Na jednej strane si prečítajte nákupy (kúpna strana) a na druhej ponuky (predajná strana).',
        'Stredná cena leží medzi najlepším nákupom a najlepšou ponukou.',
        'Väčšie riadky ďalej od stredu naznačujú, kde je hlbšia likvidita.'
      ],
      tip: 'Tenká hĺbka blízko stredu znamená, že aj malé príkazy môžu pohnúť cenou - podľa toho prispôsobte veľkosť obchodov.'
    },
    'recent-trades': {
      intro:
        'Panel posledných obchodov zobrazuje najnovšie vykonané obchody pre vybraný pár a aktualizuje sa naživo cez pripojenie SignalR, takže vždy vidíte aktuálnu aktivitu trhu.',
      steps: [
        'Otvorte obchodný pár.',
        'Nájdite panel Posledné obchody.',
        'Každý riadok zobrazuje čas, stranu (nákup/predaj), množstvo aktíva, množstvo meny a cenu.',
        'Nové obchody pribúdajú navrchu automaticky.',
        'Ak chcete históriu obnoviť manuálne, použite tlačidlo obnovenia.'
      ],
      tip: 'Stály prúd obchodov na oboch stranách je dobrým znakom zdravého a likvidného trhu.'
    },
    'pool-swap': {
      intro:
        'Priamy swap v AMM poole vám umožňuje obchodovať voči jednému konkrétnemu poolu Biatec s koncentrovanou likviditou. Je užitočný, keď chcete pracovať so známym poolom namiesto smerovania cez agregátor.',
      steps: [
        'Otvorte Spravovať likviditu pre pár alebo použite akciu Swap v tomto poole.',
        'V paneli Priamy swap v AMM poole vyberte smer (A na B alebo B na A).',
        'Zadajte sumu na odoslanie; suma na prijatie sa kótuje automaticky.',
        'Overte sa a uistite sa, že ste opt-in na aktívum, ktoré dostanete.',
        'Kliknite na Vykonať swap a schváľte v peňaženke.'
      ],
      tip: 'Pomocou Max odošlete celý zostatok odosielaného aktíva; kotácia sa aktualizuje počas písania.'
    },
    'select-pair': {
      intro:
        'Každý trh je pár aktíva a kótovacej meny. Ktorúkoľvek stranu môžete zmeniť cez výbery bez opustenia obchodnej obrazovky.',
      steps: [
        'Na obchodnej obrazovke nájdite výbery aktíva a meny.',
        'Otvorte výber aktíva a vyberte token, ktorý chcete obchodovať.',
        'Otvorte výber meny a vyberte kótovaciu menu (napríklad USD alebo ALGO).',
        'Graf, hĺbka trhu a obchody sa pre nový pár znova načítajú.',
        'URL sa aktualizuje, takže nový pár možno zdieľať alebo uložiť do záložiek.'
      ],
      tip: 'Ceny sa zobrazujú ako Aktívum/Mena; prehodenie strán invertuje zobrazenú cenu.'
    },
    'price-chart': {
      intro:
        'Cenový graf vizualizuje, ako sa cena a objem páru menili v čase, čo vám pomáha posúdiť trend a načasovanie pred zadaním príkazu.',
      steps: [
        'Otvorte obchodný pár.',
        'Nájdite cenový graf v hornej časti obrazovky.',
        'Prepínajte časové rámce (napríklad 1D, 7D, 1 rok) na priblíženie alebo oddialenie.',
        'Porovnajte aktuálne a predchádzajúce obdobia zobrazené pod grafom.',
        'Skontrolujte najnovšiu cenu oproti panelu informácií o aktíve.'
      ],
      tip: 'Použite dlhší časový rámec na zobrazenie trendu a kratší na načasovanie vstupu.'
    },
    'asset-info': {
      intro:
        'Panel informácií o aktíve zhŕňa vybraný pár: najnovšiu cenu, objem obchodov a cenu vo viacerých časových rámcoch, s ovládačom obnovenia pre najčerstvejšie údaje.',
      steps: [
        'Otvorte obchodný pár.',
        'Nájdite panel Informácie o aktíve.',
        'Prečítajte si najnovšiu cenu a údaje za minútu, 1D, 7D a rok.',
        'Skontrolujte objem za dané obdobie.',
        'Pomocou Obnoviť načítajte najnovšie hodnoty.'
      ],
      tip: 'Ak sa nezobrazujú žiadne cenové údaje, pár možno nemá nedávne obchody - skontrolujte hĺbku trhu a posledné obchody.'
    },
    'share-pair': {
      intro:
        'Obchodná obrazovka kóduje sieť a obe aktíva v URL, takže každé zobrazenie, na ktoré sa pozeráte, možno zdieľať ako bežný odkaz, ktorý sa znova otvorí na presne tom istom páre.',
      steps: [
        'Na obchodnej obrazovke otvorte pár, ktorý chcete zdieľať.',
        'Skopírujte URL prehliadača - vyzerá ako /trade/<sieť>/<aktívum>/<mena>.',
        'Pošlite odkaz komukoľvek.',
        'Keď ho otvoria, aplikácia načíta rovnaký pár v rovnakej sieti.',
        'Rovnaký vzor funguje aj pre odkazy na likviditu (/liquidity/...).'
      ],
      tip: 'Poradie páru sa normalizuje automaticky (napríklad ALGO je preferované ako mena), takže zdieľané odkazy sa vždy otvoria v konzistentnej orientácii.'
    },
    'liquidity-dashboard': {
      intro:
        'Nástenka poskytovateľa likvidity zhŕňa každý pool, v ktorom máte likviditu, vaše zostatky a ich hodnotu v USD, takže môžete spravovať svoje pozície vo všetkých pároch z jednej obrazovky.',
      steps: [
        'Otvorte LP nástenku z hornej ponuky.',
        'Skontrolujte súhrnné karty: hodnota portfólia, hodnota v pooloch, zostatky a počty pozícií.',
        'Vyberte prvé a druhé aktívum, aby ste sa zamerali na konkrétny pár.',
        'Pomocou akcií v tabuľke pridajte alebo odoberte likviditu pre ľubovoľnú pozíciu.',
        'Obnovte na opätovné načítanie zostatkov a hodnôt poolov z blockchainu.'
      ],
      tip: 'Ak chcete, aby sa aktívum zobrazilo ako možnosť pri pridávaní novej likvidity, najprv naň urobte opt-in.'
    },
    'create-pool': {
      intro:
        'Ak pre požadovaný pár ešte neexistuje pool, môžete ho vytvoriť. Vyberiete dve aktíva Algorand, nastavíte počiatočnú cenu a Biatec nasadí kontrakty poolu s koncentrovanou likviditou.',
      steps: [
        'Na stránke Preskúmať aktíva kliknite na Vytvoriť pool.',
        'Vyberte základné aktívum a kótovacie aktívum (musia byť odlišné).',
        'Vyhľadajte podľa názvu, symbolu alebo presného ID aktíva; v niektorých sieťach musíte zadať presné ASA ID.',
        'Kliknutím na Pokračovať prejdite na krok pridania likvidity.',
        'Nastavte počiatočnú cenu a tvar likvidity, potom potvrďte nasadenie a naplnenie poolu.'
      ],
      tip: 'Pomocou tlačidla prehodenia aktív môžete pred pokračovaním otočiť, ktorý token je základný a ktorý kótovací.'
    },
    'add-liquidity-focused': {
      intro:
        'Sústredený tvar umiestni najviac likvidity do aktuálneho cenového binu a postupne menej smerom k okrajom vášho rozsahu. Maximalizuje príjem z poplatkov, kým cena zostáva blízko aktuálnej úrovne.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Vyberte tvar Sústredená likvidita.',
        'Nastavte dolnú a hornú cenu, ktoré ohraničujú váš rozsah.',
        'Vyberte úroveň LP poplatku a presnosť (počet binov).',
        'Zadajte sumy vkladu, skontrolujte a potvrďte podpisom.'
      ],
      tip: 'Sústredený tvar funguje najlepšie na pokojných trhoch blízko aktuálnej ceny; ak cena opustí váš rozsah, vaša likvidita prestane zarábať poplatky.'
    },
    'add-liquidity-spread': {
      intro:
        'Rozložený tvar je opakom sústredeného: do aktuálnej ceny dá najmenej likvidity a najviac smerom k minimu a maximu vášho rozsahu, čím pokryje široké pásmo cien.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Vyberte tvar Rozložený.',
        'Definujte široký cenový rozsah od nízkej po vysokú cenu.',
        'Vyberte úroveň LP poplatku a presnosť.',
        'Zadajte vklady, skontrolujte biny a potvrďte podpisom.'
      ],
      tip: 'Rozložený tvar sa hodí pre volatilné páry, kde očakávate, že sa cena bude pohybovať v širokom pásme.'
    },
    'add-liquidity-equal': {
      intro:
        'Rovnaký tvar rozloží identickú likviditu do každého binu od vášho minima po maximum, čím poskytne rovnomerné pokrytie celého rozsahu.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Vyberte tvar Rovnaké biny.',
        'Nastavte dolnú a hornú cenu rozsahu.',
        'Vyberte úroveň LP poplatku a presnosť.',
        'Zadajte vklady, skontrolujte a potvrďte podpisom.'
      ],
      tip: 'Rovnomerné pokrytie je jednoduchá, neutrálna voľba, keď nemáte silný názor na to, kde sa bude cena v rámci vášho rozsahu obchodovať.'
    },
    'add-liquidity-single': {
      intro:
        'Tvar s jedným binom nepoužíva systém tickov/binov. Namiesto toho vytvorí jednu pozíciu likvidity s definovanou minimálnou a maximálnou cenou - klasický rozsah koncentrovanej likvidity.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Vyberte tvar Jeden bin.',
        'Nastavte minimálnu a maximálnu cenu pozície.',
        'Pomocou posuvníka podielu vyberte, koľko zo zostatku vložiť.',
        'Skontrolujte a potvrďte podpisom.'
      ],
      tip: 'Sumy vkladu sa automaticky prispôsobia pomeru poolu; ak sú príliš malé na zhodu, zvýšte obe sumy.'
    },
    'add-liquidity-wall': {
      intro:
        'Príkaz typu stena definuje jednu cenovú úroveň. Keď je trh pod ňou, ostatní od vás môžu na tejto úrovni nakupovať; keď je trh nad ňou, ostatní vám predávajú. Zarábate vždy, keď cena osciluje cez stenu.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Vyberte tvar Príkaz typu stena.',
        'Zadajte jednu úroveň cenovej steny.',
        'Zadajte vklad, ktorým chcete stenu podoprieť.',
        'Skontrolujte a potvrďte podpisom.'
      ],
      tip: 'Stena je ideálna, keď chcete akumulovať alebo distribuovať aktívum za pevnú cenu a zároveň zarábať na volatilite okolo nej.'
    },
    'remove-liquidity': {
      intro:
        'Odobratie likvidity vám vráti vložené tokeny plus všetky zarobené poplatky. Môžete vybrať percento pozície alebo z nej úplne odísť.',
      steps: [
        'Otvorte Spravovať likviditu alebo LP nástenku a nájdite pool.',
        'Pre danú pozíciu kliknite na Odobrať likviditu.',
        'Pomocou posuvníka percent (alebo Max) vyberte, koľko vybrať.',
        'Ak ste vyzvaní, overte sa.',
        'Kliknite na Odobrať likviditu a schváľte transakciu.'
      ],
      tip: 'Úplný odchod z pozície vráti aj rezervu LP tokenu (MBR), ktorá bola uzamknutá počas jej držania.'
    },
    'manage-liquidity': {
      intro:
        'Stránka Spravovať likviditu je pracovná oblasť pre pár. Zobrazuje existujúce pooly, vaše pozície a sprístupňuje akcie pridania, odobratia a priameho swapu pre daný pár.',
      steps: [
        'Prejdite na /liquidity/<sieť>/<aktívum>/<mena> alebo ju otvorte z ponuky DEX.',
        'Skontrolujte zoznam poolov a ich ceny, zostatky a poplatky.',
        'Pomocou Pridať likviditu otvorte novú pozíciu.',
        'Pomocou Odobrať likviditu vyberte z existujúcej.',
        'Pomocou Swap v tomto poole obchodujte priamo voči poolu.'
      ],
      tip: 'Ak pre pár ešte žiadny pool neexistuje, buďte prvý, kto ho vytvorí - stránka ponúkne postup Vytvoriť pool.'
    },
    'review-before-sign': {
      intro:
        'Pred každou transakciou pridania likvidity Biatec zobrazí obrazovku kontroly, ktorá rozpíše každý náklad a prevod. Je to vaša posledná možnosť overiť, čo bude vaša peňaženka žiadať podpísať.',
      steps: [
        'Dostaňte sa na krok kontroly na konci postupu Pridať likviditu.',
        'Skontrolujte vklady, náklady v ALGO, financovanie nového poolu a odhadované sieťové poplatky.',
        'Prečítajte si, koľkokrát vás peňaženka vyzve na podpis.',
        'Prejdite kontrolný zoznam overenia (žiadny rekey, žiadny clawback, správne sumy, správny kontrakt).',
        'Na Potvrdiť a podpísať kliknite len vtedy, keď všetko sedí.'
      ],
      tip: 'Ak peňaženka zobrazuje väčšiu platbu v ALGO, viac výziev, než je uvedené, alebo akýkoľvek rekey/close-out, zastavte sa a nepodpisujte.'
    },
    'liquidity-shapes': {
      intro:
        'Biatec ponúka niekoľko tvarov likvidity, ktoré rozdeľujú váš vklad medzi cenové biny rôznymi spôsobmi. Výber správneho tvaru je najdôležitejšie rozhodnutie pri poskytovaní likvidity.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Sústredený: najviac likvidity pri aktuálnej cene - maximálne poplatky, kým cena stojí.',
        'Rozložený: najviac likvidity k okrajom - vhodné pre volatilné páry so širokým rozsahom.',
        'Rovnaký: rovnaká likvidita v každom bine - jednoduché, neutrálne pokrytie.',
        'Jeden bin: jeden klasický rozsah; Stena: jedna cenová úroveň, ktorá nakupuje nízko a predáva vysoko.'
      ],
      tip: 'Pre pokojný pár začnite so Sústredeným blízko aktuálnej ceny, alebo s Rozloženým/Rovnakým, keď očakávate veľké výkyvy.'
    },
    'lp-fee-tiers': {
      intro:
        'Každý pool účtuje obchodný poplatok, ktorý ide jeho poskytovateľom likvidity. Úroveň poplatku, ktorú vyberiete (od 0,01 % do 10 %), vyvažuje, koľko zarobíte na obchod, oproti tomu, aký atraktívny je váš pool pre obchodníkov.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Nájdite výber LP poplatku.',
        'Nízke poplatky (0,01 %-0,1 %) sa hodia pre stabilné páry a priťahujú najväčší objem.',
        'Štandardné poplatky (0,2 %-0,3 %) vyvažujú zárobok a atraktivitu.',
        'Vysoké poplatky (1 %-10 %) sa hodia pre volatilné alebo špekulatívne aktíva.'
      ],
      tip: 'Prispôsobte poplatok volatilite páru - príliš vysoký a obchodníci pôjdu inam, príliš nízky a na rizikových pároch zarobíte málo.'
    },
    'price-range': {
      intro:
        'Koncentrovaná likvidita zarába poplatky len vtedy, keď je trhová cena vo vašom zvolenom rozsahu. Nastavenie dolnej a hornej ceny určuje, kde váš kapitál pracuje.',
      steps: [
        'Otvorte Pridať likviditu a vyberte tvar, ktorý používa rozsah.',
        'Zadajte dolnú cenu (spodok vášho rozsahu).',
        'Zadajte hornú cenu (vrch vášho rozsahu).',
        'Užší rozsah koncentruje poplatky, ale cena ho ľahšie opustí.',
        'Skontrolujte a potvrďte, keď rozsah zodpovedá vášmu očakávaniu.'
      ],
      tip: 'Ak cena opustí váš rozsah, vaša pozícia prestane zarábať, kým sa nevráti - rozšírte rozsah, aby ste zostali aktívni dlhšie.'
    },
    'precision-bins': {
      intro:
        'Presnosť určuje, na koľko diskrétnych binov sa váš rozsah rozdelí. Viac binov poskytuje jemnejšiu kontrolu a umožňuje vašej likvidite čisto sa agregovať s ostatnými poskytovateľmi.',
      steps: [
        'Otvorte Pridať likviditu pre pár.',
        'Vyberte tvar likvidity, ktorý používa biny.',
        'Upravte presnosť na nastavenie počtu binov v rámci vášho rozsahu.',
        'Sledujte, ako sa náhľad jednotlivých binov aktualizuje pri zmene presnosti.',
        'Skontrolujte a potvrďte nasadenie cez vybrané biny.'
      ],
      tip: 'Každý nový bin môže znamenať nový kontrakt poolu a jeho náklad MBR - vyššia presnosť je jemnejšia, ale na naplnenie stojí viac ALGO.'
    },
    'pool-costs-mbr': {
      intro:
        'Pridanie likvidity má okrem vášho vkladu aj reálne náklady v ALGO: každý nový kontrakt poolu vyžaduje minimálny zostatok (MBR) a vaša rezerva LP tokenu je uzamknutá počas držania pozície.',
      steps: [
        'Prejdite na krok kontroly v Pridať likviditu.',
        'Prečítajte si riadok financovania nového poolu - MBR za nový kontrakt cez vaše biny.',
        'Prečítajte si rezervu LP tokenu, ktorá je uzamknutá počas držania pozície.',
        'Skontrolujte odhadované sieťové poplatky a celkové ALGO z vrecka.',
        'Potvrďte, len ak celkové ALGO zodpovedá vášmu očakávaniu.'
      ],
      tip: 'Nepoužité financovanie poolu sa vráti a rezerva LP sa vráti, keď z pozície úplne odídete.'
    },
    'trader-dashboard': {
      intro:
        'Nástenka obchodníka je váš pohľad na portfólio. Zobrazuje každé aktívum, na ktoré ste opt-in, váš zostatok, živú cenu a hodnotu každej pozície v USD.',
      steps: [
        'Otvorte Obchodník z hornej ponuky.',
        'Skontrolujte súhrnné karty: hodnota portfólia, počet aktív, najväčšia pozícia a zmena za 24 h.',
        'Prejdite tabuľku pre zostatok, cenu a hodnotu pozície každého aktíva.',
        'Pomocou akcie swap obchodujte ľubovoľnú pozíciu.',
        'Obnovte na opätovné načítanie zostatkov z blockchainu.'
      ],
      tip: 'Ak aktívum, ktoré vlastníte, chýba, urobte naň odtiaľto opt-in, aby sa zobrazilo vo vašom portfóliu.'
    },
    'asset-opt-in': {
      intro:
        'Na Algorande musíte pred tým, ako ho váš účet môže držať, urobiť opt-in na aktívum (ASA). Opt-in odošle prevod tohto aktíva s nulovou sumou sebe samému.',
      steps: [
        'Otvorte Obchodník a potom Opt-in na nové aktívum, alebo prejdite na /trader/asset-opt-in.',
        'Vyhľadajte podľa názvu alebo presného ID aktíva.',
        'Vyberte aktívum z výsledkov.',
        'Uistite sa, že ste overení.',
        'Kliknite na Opt-in a schváľte transakciu s nulovou sumou.'
      ],
      tip: 'Každý opt-in uzamkne malé množstvo ALGO ako minimálny zostatok; vráti sa, ak neskôr aktívum opustíte (opt-out).'
    },
    'copy-address': {
      intro:
        'Po pripojení sa vaša skrátená adresa zobrazí v hlavičke. Celú adresu môžete jedným kliknutím skopírovať na prijímanie aktív alebo zdieľanie.',
      steps: [
        'Pripojte peňaženku, aby sa v hlavičke zobrazil čip adresy.',
        'Kliknite na čip adresy (zobrazuje prvé a posledné znaky).',
        'Celá adresa sa skopíruje do schránky a potvrdí to upozornenie.',
        'Vložte ju, kdekoľvek potrebujete prijať prostriedky.'
      ],
      tip: 'Pred odoslaním prostriedkov na adresu si vždy dôkladne skontrolujte jej prvé a posledné znaky.'
    },
    'disconnect-wallet': {
      intro:
        'Odpojenie vás odhlási z aplikácie. Keďže Biatec je samoúschovný, ukončí to iba lokálnu reláciu - vaše aktíva vždy zostávajú vo vašom vlastnom účte.',
      steps: [
        'Nájdite tlačidlo Odhlásiť sa v hlavičke vedľa čipu adresy.',
        'Kliknite na Odhlásiť sa.',
        'Vaša relácia sa ukončí a overené funkcie sa opäť uzamknú.',
        'Kedykoľvek sa znova pripojte cez Prihlásiť sa.'
      ],
      tip: 'Na zdieľaných alebo verejných počítačoch sa odpojte, aby ďalšia osoba nemohla podpisovať transakcie z vašej relácie.'
    },
    'switch-network': {
      intro:
        'Biatec DEX môže bežať na Algorand Mainnet (naživo), Testnet (na testovanie) alebo lokálnej vývojovej sieti. Prepnutie siete znova načíta aktíva a vymaže zastarané údaje pre nové prostredie.',
      steps: [
        'Otvorte ponuku nastavení (ozubené koleso) v hlavičke.',
        'Rozbaľte sekciu Prostredie.',
        'Vyberte Algorand (Mainnet), Testnet alebo Localnet.',
        'Aplikácia prepne siete a aktualizuje segment siete v URL.',
        'Dostupné aktíva a pooly sa znova načítajú pre vybranú sieť.'
      ],
      tip: 'Pomocou Testnetu si precvičte celý životný cyklus vytvorenia poolu, pridania likvidity a swapu s bezplatnými testnet tokenmi pred prechodom na Mainnet.'
    },
    'settings-blockchain': {
      intro:
        'Stránka Nastavenia vám umožňuje prispôsobiť pripojenie k blockchainu - užitočné pri behu na Localnet alebo vlastnom uzle - vrátane endpointu, portu, tokenu a offsetu posledného platného kola.',
      steps: [
        'Otvorte Nastavenia cez položku Konfigurácia v ponuke ozubeného kolesa alebo prejdite na /settings.',
        'Nájdite sekciu Konfigurácia blockchainu.',
        'Nastavte endpoint, port a token pre váš uzol.',
        'Ak potrebujete dlhšie okno platnosti transakcie, upravte offset posledného platného kola (predvolene 100).',
        'Vaše nastavenia sa uložia lokálne a použijú pre nasledujúce transakcie.'
      ],
      tip: 'Offset kola riadi, koľko kôl zostane transakcia platná po svojom prvom platnom kole - na pomalých pripojeniach ho zvýšte.'
    },
    'settings-swap': {
      intro:
        'Slippage je rozdiel medzi kótovanou cenou a cenou, ktorú skutočne dostanete. Konfigurácia swapu vám umožňuje ohraničiť ho v bázických bodoch, takže príkazy sa zamietnu, ak sa trh pohne príliš ďaleko.',
      steps: [
        'Otvorte Nastavenia z ponuky ozubeného kolesa alebo prejdite na /settings.',
        'Nájdite sekciu Konfigurácia SWAP.',
        'Nastavte hodnotu Slippage BPS (1 bp = 0,01 %).',
        'Nižšie hodnoty chránia vašu cenu; vyššie hodnoty zvyšujú pravdepodobnosť vyplnenia na rýchlych trhoch.',
        'Nastavenie sa použije na vaše nasledujúce nákupné a predajné príkazy.'
      ],
      tip: 'Stabilné páry môžu použiť tesný slippage; volatilné alebo tenké trhy môžu na vykonanie potrebovať širšiu toleranciu.'
    },
    'reset-settings': {
      intro:
        'Ak sa vaša lokálna konfigurácia dostane do zlého stavu, nebezpečná zóna v Nastaveniach vám umožňuje jedným kliknutím obnoviť všetko na predvolené hodnoty.',
      steps: [
        'Otvorte Nastavenia z ponuky ozubeného kolesa alebo prejdite na /settings.',
        'Prejdite na sekciu Predvolená konfigurácia.',
        'Nájdite Nebezpečnú zónu.',
        'Kliknite na Obnoviť konfiguráciu.',
        'Aplikácia obnoví predvolené nastavenia blockchainu, swapu a rozhrania.'
      ],
      tip: 'Obnovenie ovplyvní iba lokálne uložené preferencie - nikdy sa nedotkne vašich aktív na reťazci ani peňaženky.'
    },
    'tx-validity': {
      intro:
        'Transakcie Algorand sú platné len počas okna kôl. Offset posledného platného kola nastavuje, koľko kôl po prvom platnom kole môžu byť vaše transakcie ešte potvrdené.',
      steps: [
        'Otvorte Nastavenia z ponuky ozubeného kolesa alebo prejdite na /settings.',
        'Nájdite sekciu Konfigurácia blockchainu.',
        'Upravte offset posledného platného kola (predvolene 100).',
        'Väčší offset dáva transakciám viac času na potvrdenie na pomalých pripojeniach.',
        'Nastavenie sa uloží lokálne a použije na nové transakcie.'
      ],
      tip: 'Ak transakcie vypršia skôr, než dokončíte podpis, offset zvýšte; ak chcete tesnejšie vypršanie, znížte ho.'
    },
    'localnet-dev': {
      intro:
        'Localnet umožňuje vývojárom spustiť Biatec DEX proti lokálnemu uzlu Algorand s vlastným endpointom, portom a tokenom - ideálne na testovanie kontraktov a postupov bez dotyku verejných sietí.',
      steps: [
        'Spustite svoju lokálnu sieť Algorand (napríklad pomocou AlgoKit).',
        'Otvorte ponuku nastavení (ozubené koleso) a prepnite Prostredie na Localnet.',
        'Otvorte Nastavenia a nastavte endpoint, port a token blockchainu na váš uzol.',
        'Dostupné aktíva a pooly sa znova načítajú pre Localnet.',
        'Otestujte celý životný cyklus vytvorenia poolu, pridania likvidity a swapu lokálne.'
      ],
      tip: 'Localnet je najbezpečnejšie miesto na experimentovanie - tokeny a pooly tam nemajú žiadnu reálnu hodnotu.'
    },
    about: {
      intro:
        'Stránka O aplikácii vysvetľuje projekt: samoúschovný AMM s koncentrovanou likviditou na Algorande, postavený s podporou programu Algorand Foundation xGov. Tiež uvádza aktíva a dôležité upozornenia.',
      steps: [
        'Otvorte O aplikácii z ponuky DEX alebo prejdite na /about.',
        'Prečítajte si prehľad protokolu CLAMM a DEX agregátora.',
        'Prejdite si upozornenia o samoúschove a beta softvéri.',
        'Prezrite si tabuľku zaradených aktív a vyhľadávajte v nej.',
        'Sledujte odkazy na dokumentáciu a zdrojový kód pre viac detailov.'
      ],
      tip: 'Vždy si overte každú transakciu, ktorú podpisujete - kontrakty sú stále vo vývoji a za svoje účty zodpovedáte vy.'
    },
    documentation: {
      intro:
        'Okrem tejto vstavanej pomoci Biatec udržiava externú dokumentáciu a open-source kódovú základňu pre hlbšie technické detaily o protokole a aplikácii.',
      steps: [
        'Otvorte ponuku nastavení (ozubené koleso) a vyberte Dokumentácia, alebo navštívte stránku O aplikácii.',
        'Sledujte odkaz Dokumentácia na docs.dex.biatec.io.',
        'Použite odkazy na stránke O aplikácii pre zdrojový kód na GitHube.',
        'Detaily protokolu nezahrnuté v týchto návodoch nájdete v dokumentácii.',
        'Pre podrobné postupy aplikácie sa vráťte do tohto centra pomoci.'
      ],
      tip: 'Toto centrum pomoci používajte na praktické postupy a externú dokumentáciu na špecifiká protokolu a kontraktov.'
    },
    'security-best-practices': {
      intro:
        'Biatec DEX nikdy nedrží vaše aktíva, čo znamená, že bezpečnosť je vo vašich rukách. Niekoľko návykov dramaticky zníži vaše riziko pri podpisovaní transakcií.',
      steps: [
        'Pred podpisom overte každú transakciu v peňaženke - sumy, príjemcov a žiadny rekey ani close-out.',
        'Pre veľké zostatky uprednostnite multisig účet s hardvérovými podpisovačmi.',
        'Účty ARC-76 s e-mailom/heslom berte ako najrýchlejšiu, ale najmenej bezpečnú možnosť.',
        'Nikdy nezdieľajte svoju mnemoniku ani heslo a dávajte si pozor na napodobeniny podvodných tokenov.',
        'Pred pripojením peňaženky si dôkladne overte, že ste na oficiálnej stránke.'
      ],
      tip: 'Najsilnejšie nastavenie je multisig s 2FA cez viacero hardvérových zariadení (napríklad Ledger).'
    },
    'help-center': {
      intro:
        'Toto centrum pomoci uvádza každú funkciu Biatec DEX ako vyhľadateľný návod. Každý návod vysvetľuje funkciu krok za krokom a zobrazuje snímku obrazovky vo vašom aktuálnom jazyku.',
      steps: [
        'Otvorte Pomoc cez ikonu otáznika v hlavičke.',
        'Vyhľadajte alebo prechádzajte kategórie na nájdenie témy.',
        'Otvorte návod a prečítajte si jeho popis, kroky a tip.',
        'Pomocou Otvoriť funkciu prejdite priamo na danú časť aplikácie.',
        'Pokračujte v učení cez súvisiace návody v dolnej časti.'
      ],
      tip: 'Ak chcete snímky a text pomoci v inom jazyku, najprv prepnite jazyk rozhrania.'
    }
  },
  pl: {
    'explore-assets': {
      intro:
        'Strona Przeglądaj aktywa to strona główna Biatec DEX. Agreguje każde aktywo występujące w puli płynności, więc przed handlem lub dostarczeniem płynności możesz przejrzeć całkowitą zablokowaną wartość (TVL), bieżące ceny i liczbę pul stojących za każdym tokenem.',
      steps: [
        'Otwórz Przeglądaj z górnego menu (to także strona startowa pod /).',
        'Użyj pola wyszukiwania, aby filtrować tabelę według nazwy, symbolu lub ID aktywa.',
        'Przeczytaj karty podsumowania dla łącznego TVL, liczby pul i liczby notowanych aktywów.',
        'Posortuj dowolną kolumnę - na przykład według łącznego TVL lub wolumenu 24 h - aby znaleźć najaktywniejsze rynki.',
        'Użyj akcji w wierszu, aby przejść bezpośrednio do handlu, dodania lub usunięcia płynności dla aktywa.'
      ],
      tip: 'Kolumny takie jak VWAP 1D/7D oraz Opłaty 1D/7D pomagają ocenić, czy rynek jest płynny i ile dochodu z opłat generują jego pule.'
    },
    'find-asset-by-id': {
      intro:
        'Każde aktywo Algorand ma unikalne numeryczne ID. Gdy nazwa tokenu jest niejednoznaczna - lub niedostępna w bieżącej sieci - możesz go precyzyjnie znaleźć po dokładnym ID aktywa (ASA).',
      steps: [
        'Otwórz Przeglądaj aktywa, Opt-in lub Utwórz pulę - wszystkie obsługują wyszukiwanie po ID.',
        'Wpisz dokładne numeryczne ID aktywa w polu wyszukiwania.',
        'W sieciach, gdzie indeks aktywów jest niedostępny, do dodania wymagane jest podanie dokładnego ASA ID.',
        'Przed kontynuacją potwierdź nazwę i symbol znalezionego aktywa.',
        'Przejdź do handlu, opt-in lub dodaj je do puli.'
      ],
      tip: 'ID aktywów to najbezpieczniejszy sposób identyfikacji tokenu - nazwy i symbole mogą kopiować tokeny oszustów, ale ID jest unikalne.'
    },
    'connect-wallet': {
      intro:
        'Biatec DEX jest w pełni samoobsługowy - połączenie portfela jedynie potwierdza, że kontrolujesz adres Algorand, i pozwala podpisywać transakcje. DEX nigdy nie przechowuje Twoich aktywów.',
      steps: [
        'Kliknij Zaloguj w prawym górnym rogu nagłówka.',
        'Wybierz portfel - obsługiwane są Pera, Defly, Lute, WalletConnect i inne.',
        'Alternatywnie użyj e-maila i hasła ARC-76, aby wyprowadzić konto Algorand w przeglądarce.',
        'Zatwierdź żądanie uwierzytelnienia ARC-14, aby aplikacja potwierdziła, że jesteś właścicielem adresu.',
        'Po połączeniu Twój skrócony adres pojawi się w nagłówku; kliknij, aby skopiować pełny adres.'
      ],
      tip: 'Dla najwyższego bezpieczeństwa użyj konta multisig ze sprzętowymi podpisującymi; opcja e-mail/hasło jest najszybsza, ale najmniej bezpieczna.'
    },
    'switch-language': {
      intro:
        'Cały interfejs jest przetłumaczony na dziesięć języków. Twój wybór jest zapisywany w przeglądarce, więc aplikacja otworzy się następnym razem w tym samym języku.',
      steps: [
        'Otwórz menu ustawień (koło zębate) w nagłówku.',
        'Rozwiń sekcję Język.',
        'Wybierz język z listy - aktywny jest oznaczony znacznikiem.',
        'Interfejs aktualizuje się natychmiast bez przeładowania strony.'
      ],
      tip: 'Przy pierwszej wizycie aplikacja próbuje dopasować język przeglądarki, zanim wróci do angielskiego.'
    },
    'switch-theme': {
      intro:
        'Biatec DEX oferuje motyw jasny i ciemny. Preferencja jest zapamiętywana między wizytami.',
      steps: [
        'Znajdź przycisk słońce/księżyc w nagłówku obok przycisku Zaloguj lub żetonu konta.',
        'Kliknij, aby przełączyć między trybem jasnym i ciemnym.',
        'Tło otoczenia i każdy komponent natychmiast zmieniają motyw.'
      ],
      tip: 'Twój wybór motywu jest zapisywany lokalnie, więc aplikacja otworzy się w preferowanym trybie.'
    },
    'trade-screen': {
      intro:
        'Ekran handlu łączy wszystko, czego potrzebujesz do handlu jednym aktywem względem drugiego: wykres ceny, głębokość rynku, ostatnie transakcje i panel składania zleceń. Para jest zakodowana w URL, więc każdy widok można udostępnić.',
      steps: [
        'Otwórz parę przez Przeglądaj a następnie Swap, lub przejdź do /trade/<sieć>/<aktywo>/<waluta>.',
        'Użyj selektorów aktywa i waluty, aby zmienić dowolną stronę pary.',
        'Obserwuj wykres ceny i panel informacji o aktywie dla najnowszej ceny i wolumenu.',
        'Przeczytaj głębokość rynku i ostatnie transakcje, aby ocenić płynność.',
        'Złóż zlecenie kupna lub sprzedaży w panelu zleceń rynkowych po prawej.'
      ],
      tip: 'Ceny są zawsze pokazywane jako Aktywo/Waluta (na przykład GD/USD); zamiana kolejności pary odwraca notowanie.'
    },
    'buy-order': {
      intro:
        'Zlecenie kupna rynkowe wydaje Twoją walutę kwotowaną na nabycie aktywa bazowego. Zlecenia są kierowane przez agregator Folks Router i pule Biatec CLAMM, aby znaleźć najlepsze wykonanie.',
      steps: [
        'Na ekranie handlu wybierz kartę Kupno w panelu zleceń rynkowych.',
        'Wprowadź ilość aktywa, które chcesz kupić.',
        'Sprawdź notowanie na żywo, w tym poślizg w punktach bazowych.',
        'Upewnij się, że jesteś uwierzytelniony i masz opt-in na aktywo.',
        'Kliknij Kup i zatwierdź transakcję w portfelu.'
      ],
      tip: 'Jeśli notowanie przekroczy skonfigurowany poślizg, zlecenie zostaje odrzucone dla Twojej ochrony - zwiększ poślizg w Ustawieniach tylko jeśli akceptujesz gorszą cenę.'
    },
    'sell-order': {
      intro:
        'Zlecenie sprzedaży rynkowe zamienia aktywo bazowe z powrotem na walutę kwotowaną. Podobnie jak kupna, sprzedaże są kierowane przez agregator i pule CLAMM dla najlepszej ceny.',
      steps: [
        'Na ekranie handlu wybierz kartę Sprzedaż w panelu zleceń rynkowych.',
        'Wprowadź ilość aktywa, które chcesz sprzedać.',
        'Przed potwierdzeniem sprawdź notowanie i pokazany poślizg.',
        'Potwierdź, że jesteś uwierzytelniony i posiadasz aktywo.',
        'Kliknij Sprzedaj i zatwierdź transakcję w portfelu.'
      ],
      tip: 'Najpierw obserwuj ostatnie transakcje i głębokość rynku - sprzedaż w cienką płynność bardziej rusza ceną, zwiększając poślizg.'
    },
    'market-depth': {
      intro:
        'Panel głębokości rynku pokazuje zagregowane oferty kupna i sprzedaży wokół ceny środkowej, więc widzisz, jaki rozmiar rynek może wchłonąć, zanim cena się poruszy.',
      steps: [
        'Otwórz dowolną parę handlową.',
        'Znajdź panel Głębokość rynku.',
        'Po jednej stronie przeczytaj oferty kupna, a po drugiej oferty sprzedaży.',
        'Cena środkowa leży między najlepszą ofertą kupna a najlepszą ofertą sprzedaży.',
        'Większe wiersze dalej od środka wskazują, gdzie jest głębsza płynność.'
      ],
      tip: 'Cienka głębokość blisko środka oznacza, że nawet małe zlecenia mogą poruszyć ceną - odpowiednio dobieraj rozmiar transakcji.'
    },
    'recent-trades': {
      intro:
        'Panel ostatnich transakcji wyświetla najnowsze zrealizowane transakcje dla wybranej pary, aktualizując się na żywo przez połączenie SignalR, więc zawsze widzisz bieżącą aktywność rynku.',
      steps: [
        'Otwórz parę handlową.',
        'Znajdź panel Ostatnie transakcje.',
        'Każdy wiersz pokazuje czas, stronę (kupno/sprzedaż), ilość aktywa, ilość waluty i cenę.',
        'Nowe transakcje pojawiają się na górze automatycznie.',
        'Aby odświeżyć historię ręcznie, użyj przycisku odświeżania.'
      ],
      tip: 'Stały strumień transakcji po obu stronach to dobry znak zdrowego, płynnego rynku.'
    },
    'pool-swap': {
      intro:
        'Bezpośredni swap w puli AMM pozwala handlować względem jednej konkretnej puli Biatec ze skoncentrowaną płynnością. Jest przydatny, gdy chcesz korzystać ze znanej puli zamiast kierować przez agregator.',
      steps: [
        'Otwórz Zarządzaj płynnością dla pary lub użyj akcji Swap w tej puli.',
        'W panelu Bezpośredni swap w puli AMM wybierz kierunek (A na B lub B na A).',
        'Wprowadź kwotę do wysłania; kwota do otrzymania jest notowana automatycznie.',
        'Uwierzytelnij się i upewnij się, że masz opt-in na aktywo, które otrzymasz.',
        'Kliknij Wykonaj swap i zatwierdź w portfelu.'
      ],
      tip: 'Użyj Max, aby wysłać całe saldo wysyłanego aktywa; notowanie aktualizuje się podczas pisania.'
    },
    'select-pair': {
      intro:
        'Każdy rynek to para aktywa i waluty kwotowanej. Dowolną stronę możesz zmienić w selektorach bez opuszczania ekranu handlu.',
      steps: [
        'Na ekranie handlu znajdź selektory aktywa i waluty.',
        'Otwórz selektor aktywa, aby wybrać token do handlu.',
        'Otwórz selektor waluty, aby wybrać walutę kwotowaną (na przykład USD lub ALGO).',
        'Wykres, głębokość rynku i transakcje przeładują się dla nowej pary.',
        'URL się aktualizuje, więc nową parę można udostępnić lub dodać do zakładek.'
      ],
      tip: 'Ceny są pokazywane jako Aktywo/Waluta; zamiana stron odwraca wyświetlaną cenę.'
    },
    'price-chart': {
      intro:
        'Wykres ceny wizualizuje, jak cena i wolumen pary zmieniały się w czasie, pomagając ocenić trend i moment przed złożeniem zlecenia.',
      steps: [
        'Otwórz parę handlową.',
        'Znajdź wykres ceny u góry ekranu.',
        'Przełączaj ramy czasowe (na przykład 1D, 7D, 1 rok), aby przybliżać lub oddalać.',
        'Porównaj bieżący i poprzedni okres pokazane pod wykresem.',
        'Sprawdź najnowszą cenę względem panelu informacji o aktywie.'
      ],
      tip: 'Użyj dłuższej ramy czasowej, aby zobaczyć trend, i krótszej, aby wybrać moment wejścia.'
    },
    'asset-info': {
      intro:
        'Panel informacji o aktywie podsumowuje wybraną parę: najnowszą cenę, wolumen handlu i cenę w kilku ramach czasowych, z przyciskiem odświeżania dla najświeższych danych.',
      steps: [
        'Otwórz parę handlową.',
        'Znajdź panel Informacje o aktywie.',
        'Przeczytaj najnowszą cenę oraz dane minutowe, 1D, 7D i roczne.',
        'Sprawdź wolumen za dany okres.',
        'Użyj Odśwież, aby przeładować najnowsze wartości.'
      ],
      tip: 'Jeśli nie pojawiają się dane cenowe, para może nie mieć ostatnich transakcji - sprawdź głębokość rynku i ostatnie transakcje.'
    },
    'share-pair': {
      intro:
        'Ekran handlu koduje sieć i oba aktywa w URL, więc każdy oglądany widok można udostępnić jako zwykły link, który ponownie otworzy dokładnie tę samą parę.',
      steps: [
        'Na ekranie handlu otwórz parę, którą chcesz udostępnić.',
        'Skopiuj URL przeglądarki - wygląda jak /trade/<sieć>/<aktywo>/<waluta>.',
        'Wyślij link komukolwiek.',
        'Gdy go otworzą, aplikacja załaduje tę samą parę w tej samej sieci.',
        'Ten sam wzorzec działa dla linków płynności (/liquidity/...).'
      ],
      tip: 'Kolejność pary jest normalizowana automatycznie (na przykład ALGO jest preferowane jako waluta), więc udostępniane linki zawsze otwierają się w spójnej orientacji.'
    },
    'liquidity-dashboard': {
      intro:
        'Panel dostawcy płynności podsumowuje każdą pulę, w której masz płynność, Twoje salda i ich wartość w USD, więc możesz zarządzać pozycjami we wszystkich parach z jednego ekranu.',
      steps: [
        'Otwórz Panel LP z górnego menu.',
        'Sprawdź karty podsumowania: wartość portfela, wartość w pulach, salda i liczby pozycji.',
        'Wybierz pierwsze i drugie aktywo, aby skupić się na konkretnej parze.',
        'Użyj akcji w tabeli, aby dodać lub usunąć płynność dla dowolnej pozycji.',
        'Odśwież, aby przeładować salda i wartości pul z blockchaina.'
      ],
      tip: 'Jeśli chcesz, aby aktywo pojawiło się jako opcja przy dodawaniu nowej płynności, najpierw zrób na nie opt-in.'
    },
    'create-pool': {
      intro:
        'Jeśli dla żądanej pary nie istnieje jeszcze pula, możesz ją utworzyć. Wybierasz dwa aktywa Algorand, ustawiasz cenę początkową, a Biatec wdraża kontrakty puli ze skoncentrowaną płynnością.',
      steps: [
        'Na stronie Przeglądaj aktywa kliknij Utwórz pulę.',
        'Wybierz aktywo bazowe i aktywo kwotowane (muszą być różne).',
        'Wyszukaj po nazwie, symbolu lub dokładnym ID aktywa; w niektórych sieciach musisz podać dokładne ASA ID.',
        'Kliknij Kontynuuj, aby przejść do kroku dodawania płynności.',
        'Ustaw cenę początkową i kształt płynności, następnie potwierdź wdrożenie i zasilenie puli.'
      ],
      tip: 'Użyj przycisku zamiany aktywów, aby przed kontynuacją odwrócić, który token jest bazowy, a który kwotowany.'
    },
    'add-liquidity-focused': {
      intro:
        'Kształt skupiony umieszcza najwięcej płynności w bieżącym koszu cenowym i stopniowo mniej w kierunku krawędzi Twojego zakresu. Maksymalizuje dochód z opłat, dopóki cena pozostaje blisko bieżącego poziomu.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Wybierz kształt Skupiona płynność.',
        'Ustaw dolną i górną cenę ograniczające Twój zakres.',
        'Wybierz poziom opłaty LP i precyzję (liczbę koszy).',
        'Wprowadź kwoty depozytu, sprawdź i potwierdź podpisem.'
      ],
      tip: 'Skupiony działa najlepiej na spokojnych rynkach blisko bieżącej ceny; jeśli cena opuści Twój zakres, płynność przestaje zarabiać opłaty.'
    },
    'add-liquidity-spread': {
      intro:
        'Kształt rozproszony jest przeciwieństwem skupionego: umieszcza najmniej płynności przy bieżącej cenie, a najwięcej w kierunku minimum i maksimum Twojego zakresu, pokrywając szerokie pasmo cen.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Wybierz kształt Rozproszony.',
        'Zdefiniuj szeroki zakres cenowy od niskiej do wysokiej.',
        'Wybierz poziom opłaty LP i precyzję.',
        'Wprowadź depozyty, sprawdź kosze i potwierdź podpisem.'
      ],
      tip: 'Rozproszony pasuje do par zmiennych, gdzie spodziewasz się wahań ceny w szerokim paśmie.'
    },
    'add-liquidity-equal': {
      intro:
        'Kształt równy rozkłada identyczną płynność na każdy kosz od minimum do maksimum, dając jednolite pokrycie całego zakresu.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Wybierz kształt Równe kosze.',
        'Ustaw dolną i górną cenę zakresu.',
        'Wybierz poziom opłaty LP i precyzję.',
        'Wprowadź depozyty, sprawdź i potwierdź podpisem.'
      ],
      tip: 'Równe pokrycie to proste, neutralne podejście, gdy nie masz silnego zdania, gdzie cena będzie się obracać w Twoim zakresie.'
    },
    'add-liquidity-single': {
      intro:
        'Kształt jednego kosza nie używa systemu ticków/koszy. Zamiast tego tworzy jedną pozycję płynności ze zdefiniowaną ceną minimalną i maksymalną - klasyczny zakres skoncentrowanej płynności.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Wybierz kształt Jeden kosz.',
        'Ustaw cenę minimalną i maksymalną pozycji.',
        'Użyj suwaka udziału, aby wybrać, ile salda zdeponować.',
        'Sprawdź i potwierdź podpisem.'
      ],
      tip: 'Kwoty depozytu są automatycznie dopasowywane do proporcji puli; jeśli są zbyt małe, aby pasować, zwiększ obie kwoty.'
    },
    'add-liquidity-wall': {
      intro:
        'Zlecenie typu ściana definiuje jeden poziom cenowy. Gdy rynek jest poniżej, inni mogą od Ciebie kupować na tym poziomie; gdy rynek jest powyżej, inni Ci sprzedają. Zarabiasz, gdy cena oscyluje wokół ściany.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Wybierz kształt Zlecenie typu ściana.',
        'Wprowadź jeden poziom ściany cenowej.',
        'Wprowadź depozyt, którym chcesz wesprzeć ścianę.',
        'Sprawdź i potwierdź podpisem.'
      ],
      tip: 'Ściana jest idealna, gdy chcesz akumulować lub dystrybuować aktywo po stałej cenie, jednocześnie zarabiając na zmienności wokół niej.'
    },
    'remove-liquidity': {
      intro:
        'Usunięcie płynności zwraca Twoje zdeponowane tokeny plus zarobione opłaty. Możesz wypłacić procent pozycji lub całkowicie z niej wyjść.',
      steps: [
        'Otwórz Zarządzaj płynnością lub Panel LP i znajdź pulę.',
        'Kliknij Usuń płynność dla tej pozycji.',
        'Użyj suwaka procentowego (lub Max), aby wybrać, ile wypłacić.',
        'Jeśli pojawi się monit, uwierzytelnij się.',
        'Kliknij Usuń płynność i zatwierdź transakcję.'
      ],
      tip: 'Całkowite wyjście z pozycji zwraca także rezerwę tokenu LP (MBR), która była zablokowana podczas jej trzymania.'
    },
    'manage-liquidity': {
      intro:
        'Strona Zarządzaj płynnością to obszar roboczy dla pary. Wyświetla istniejące pule, Twoje pozycje i udostępnia akcje dodawania, usuwania i bezpośredniego swapu dla tej pary.',
      steps: [
        'Przejdź do /liquidity/<sieć>/<aktywo>/<waluta> lub otwórz ją z menu DEX.',
        'Sprawdź listę pul oraz ich ceny, salda i opłaty.',
        'Użyj Dodaj płynność, aby otworzyć nową pozycję.',
        'Użyj Usuń płynność, aby wypłacić z istniejącej.',
        'Użyj Swap w tej puli, aby handlować bezpośrednio z pulą.'
      ],
      tip: 'Jeśli dla pary nie istnieje jeszcze żadna pula, bądź pierwszy, który ją utworzy - strona zaproponuje proces Utwórz pulę.'
    },
    'review-before-sign': {
      intro:
        'Przed każdą transakcją dodawania płynności Biatec pokazuje ekran przeglądu, który wyszczególnia każdy koszt i transfer. To Twoja ostatnia szansa, aby zweryfikować, co portfel poprosi o podpisanie.',
      steps: [
        'Dotrzyj do kroku przeglądu na końcu procesu Dodaj płynność.',
        'Sprawdź depozyty, koszty ALGO, finansowanie nowej puli i szacowane opłaty sieciowe.',
        'Przeczytaj, ile razy portfel poprosi Cię o podpis.',
        'Przejdź listę kontrolną weryfikacji (brak rekey, brak clawback, poprawne kwoty, poprawny kontrakt).',
        'Kliknij Potwierdź i podpisz tylko wtedy, gdy wszystko się zgadza.'
      ],
      tip: 'Jeśli portfel pokazuje większą płatność ALGO, więcej monitów niż podano lub jakikolwiek rekey/close-out, zatrzymaj się i nie podpisuj.'
    },
    'liquidity-shapes': {
      intro:
        'Biatec oferuje kilka kształtów płynności, które rozdzielają Twój depozyt między kosze cenowe na różne sposoby. Wybór właściwego kształtu to najważniejsza decyzja przy dostarczaniu płynności.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Skupiony: najwięcej płynności przy bieżącej cenie - maksymalne opłaty, gdy cena stoi.',
        'Rozproszony: najwięcej płynności ku krawędziom - dobry dla par zmiennych o szerokim zakresie.',
        'Równy: ta sama płynność w każdym koszu - proste, neutralne pokrycie.',
        'Jeden kosz: jeden klasyczny zakres; Ściana: jeden poziom cenowy kupujący nisko i sprzedający wysoko.'
      ],
      tip: 'Dla spokojnej pary zacznij od Skupionego blisko bieżącej ceny, lub od Rozproszonego/Równego, gdy spodziewasz się dużych wahań.'
    },
    'lp-fee-tiers': {
      intro:
        'Każda pula pobiera opłatę handlową, która trafia do jej dostawców płynności. Poziom opłaty, który wybierzesz (od 0,01% do 10%), równoważy, ile zarabiasz na transakcji, z tym, jak atrakcyjna jest Twoja pula dla traderów.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Znajdź selektor opłaty LP.',
        'Niskie opłaty (0,01%-0,1%) pasują do par stabilnych i przyciągają największy wolumen.',
        'Standardowe opłaty (0,2%-0,3%) równoważą zarobek i atrakcyjność.',
        'Wysokie opłaty (1%-10%) pasują do aktywów zmiennych lub spekulacyjnych.'
      ],
      tip: 'Dopasuj opłatę do zmienności pary - zbyt wysoka, a traderzy pójdą gdzie indziej, zbyt niska, a zarobisz mało na ryzykownych parach.'
    },
    'price-range': {
      intro:
        'Skoncentrowana płynność zarabia opłaty tylko wtedy, gdy cena rynkowa jest w wybranym zakresie. Ustawienie dolnej i górnej ceny określa, gdzie pracuje Twój kapitał.',
      steps: [
        'Otwórz Dodaj płynność i wybierz kształt korzystający z zakresu.',
        'Wprowadź dolną cenę (spód Twojego zakresu).',
        'Wprowadź górną cenę (szczyt Twojego zakresu).',
        'Węższy zakres koncentruje opłaty, ale cena łatwiej go opuszcza.',
        'Sprawdź i potwierdź, gdy zakres odpowiada Twoim oczekiwaniom.'
      ],
      tip: 'Jeśli cena opuści Twój zakres, pozycja przestaje zarabiać do jej powrotu - poszerz zakres, aby pozostać aktywnym dłużej.'
    },
    'precision-bins': {
      intro:
        'Precyzja określa, na ile dyskretnych koszy dzieli się Twój zakres. Więcej koszy daje dokładniejszą kontrolę i pozwala Twojej płynności czysto agregować się z innymi dostawcami.',
      steps: [
        'Otwórz Dodaj płynność dla pary.',
        'Wybierz kształt płynności korzystający z koszy.',
        'Dostosuj precyzję, aby ustawić liczbę koszy w Twoim zakresie.',
        'Obserwuj, jak podgląd poszczególnych koszy aktualizuje się przy zmianie precyzji.',
        'Sprawdź i potwierdź wdrożenie w wybranych koszach.'
      ],
      tip: 'Każdy nowy kosz może oznaczać nowy kontrakt puli i jego koszt MBR - wyższa precyzja jest dokładniejsza, ale zasilenie kosztuje więcej ALGO.'
    },
    'pool-costs-mbr': {
      intro:
        'Dodawanie płynności ma realne koszty ALGO poza Twoim depozytem: każdy nowy kontrakt puli wymaga minimalnego salda (MBR), a Twoja rezerwa tokenu LP jest zablokowana podczas trzymania pozycji.',
      steps: [
        'Przejdź do kroku przeglądu w Dodaj płynność.',
        'Przeczytaj wiersz finansowania nowej puli - MBR za nowy kontrakt w Twoich koszach.',
        'Przeczytaj rezerwę tokenu LP zablokowaną podczas trzymania pozycji.',
        'Sprawdź szacowane opłaty sieciowe i łączne ALGO z kieszeni.',
        'Potwierdź tylko, jeśli łączne ALGO odpowiada Twoim oczekiwaniom.'
      ],
      tip: 'Niewykorzystane finansowanie puli jest zwracane, a rezerwa LP wraca, gdy całkowicie wyjdziesz z pozycji.'
    },
    'trader-dashboard': {
      intro:
        'Panel tradera to widok Twojego portfela. Wyświetla każde aktywo, na które masz opt-in, Twoje saldo, cenę na żywo i wartość każdej pozycji w USD.',
      steps: [
        'Otwórz Trader z górnego menu.',
        'Sprawdź karty podsumowania: wartość portfela, liczba aktywów, największa pozycja i zmiana 24 h.',
        'Przejrzyj tabelę dla salda, ceny i wartości pozycji każdego aktywa.',
        'Użyj akcji swap, aby handlować dowolną pozycją.',
        'Odśwież, aby przeładować salda z blockchaina.'
      ],
      tip: 'Jeśli brakuje aktywa, które posiadasz, zrób na nie tutaj opt-in, aby pojawiło się w Twoim portfelu.'
    },
    'asset-opt-in': {
      intro:
        'Na Algorandzie musisz zrobić opt-in na aktywo (ASA), zanim Twoje konto będzie mogło je trzymać. Opt-in wysyła transfer tego aktywa o zerowej kwocie do siebie.',
      steps: [
        'Otwórz Trader a następnie Opt-in na nowe aktywo, lub przejdź do /trader/asset-opt-in.',
        'Wyszukaj po nazwie lub dokładnym ID aktywa.',
        'Wybierz aktywo z wyników.',
        'Upewnij się, że jesteś uwierzytelniony.',
        'Kliknij Opt-in i zatwierdź transakcję o zerowej kwocie.'
      ],
      tip: 'Każdy opt-in blokuje małą ilość ALGO jako minimalne saldo; jest zwracana, jeśli później zrobisz opt-out z aktywa.'
    },
    'copy-address': {
      intro:
        'Po połączeniu Twój skrócony adres pojawia się w nagłówku. Pełny adres możesz skopiować jednym kliknięciem, aby odbierać aktywa lub go udostępnić.',
      steps: [
        'Połącz portfel, aby żeton adresu pojawił się w nagłówku.',
        'Kliknij żeton adresu (pokazuje pierwsze i ostatnie znaki).',
        'Pełny adres jest kopiowany do schowka, a powiadomienie to potwierdza.',
        'Wklej go wszędzie tam, gdzie potrzebujesz odebrać środki.'
      ],
      tip: 'Przed wysłaniem środków na adres zawsze dokładnie sprawdź jego pierwsze i ostatnie znaki.'
    },
    'disconnect-wallet': {
      intro:
        'Odłączenie wylogowuje Cię z aplikacji. Ponieważ Biatec jest samoobsługowy, kończy to tylko lokalną sesję - Twoje aktywa zawsze pozostają na Twoim koncie.',
      steps: [
        'Znajdź przycisk Wyloguj w nagłówku obok żetonu adresu.',
        'Kliknij Wyloguj.',
        'Twoja sesja się kończy, a funkcje uwierzytelnione znów się blokują.',
        'Połącz ponownie w dowolnym momencie przez Zaloguj.'
      ],
      tip: 'Na współdzielonych lub publicznych komputerach odłączaj się, aby następna osoba nie mogła podpisywać transakcji z Twojej sesji.'
    },
    'switch-network': {
      intro:
        'Biatec DEX może działać na Algorand Mainnet (na żywo), Testnet (do testów) lub lokalnej sieci deweloperskiej. Przełączenie sieci przeładowuje aktywa i czyści nieaktualne dane dla nowego środowiska.',
      steps: [
        'Otwórz menu ustawień (koło zębate) w nagłówku.',
        'Rozwiń sekcję Środowisko.',
        'Wybierz Algorand (Mainnet), Testnet lub Localnet.',
        'Aplikacja przełącza sieci i aktualizuje segment sieci w URL.',
        'Dostępne aktywa i pule przeładowują się dla wybranej sieci.'
      ],
      tip: 'Użyj Testnetu, aby przećwiczyć pełny cykl tworzenia puli, dodawania płynności i swapu z darmowymi tokenami testnet przed przejściem na Mainnet.'
    },
    'settings-blockchain': {
      intro:
        'Strona Ustawienia pozwala dostosować połączenie z blockchainem - przydatne przy pracy na Localnecie lub własnym węźle - w tym endpoint, port, token i offset ostatniej ważnej rundy.',
      steps: [
        'Otwórz Ustawienia przez pozycję Konfiguracja w menu koła zębatego lub przejdź do /settings.',
        'Znajdź sekcję Konfiguracja blockchaina.',
        'Ustaw endpoint, port i token dla swojego węzła.',
        'Dostosuj offset ostatniej ważnej rundy, jeśli potrzebujesz dłuższego okna ważności transakcji (domyślnie 100).',
        'Twoje ustawienia są zapisywane lokalnie i używane do kolejnych transakcji.'
      ],
      tip: 'Offset rundy kontroluje, ile rund transakcja pozostaje ważna po pierwszej ważnej rundzie - zwiększ go na wolnych połączeniach.'
    },
    'settings-swap': {
      intro:
        'Poślizg to różnica między ceną notowaną a ceną, którą faktycznie otrzymujesz. Konfiguracja swapu pozwala ograniczyć go w punktach bazowych, więc zlecenia są odrzucane, gdy rynek poruszy się zbyt daleko.',
      steps: [
        'Otwórz Ustawienia z menu koła zębatego lub przejdź do /settings.',
        'Znajdź sekcję Konfiguracja SWAP.',
        'Ustaw wartość Slippage BPS (1 bp = 0,01%).',
        'Niższe wartości chronią Twoją cenę; wyższe zwiększają szansę realizacji na szybkich rynkach.',
        'Ustawienie dotyczy Twoich kolejnych zleceń kupna i sprzedaży.'
      ],
      tip: 'Pary stabilne mogą używać ciasnego poślizgu; rynki zmienne lub cienkie mogą potrzebować szerszej tolerancji, aby wykonać zlecenie.'
    },
    'reset-settings': {
      intro:
        'Jeśli Twoja lokalna konfiguracja wejdzie w zły stan, strefa zagrożenia w Ustawieniach pozwala jednym kliknięciem przywrócić wszystko do wartości domyślnych.',
      steps: [
        'Otwórz Ustawienia z menu koła zębatego lub przejdź do /settings.',
        'Przewiń do sekcji Konfiguracja domyślna.',
        'Znajdź Strefę zagrożenia.',
        'Kliknij Zresetuj konfigurację.',
        'Aplikacja przywraca domyślne ustawienia blockchaina, swapu i interfejsu.'
      ],
      tip: 'Reset dotyczy tylko lokalnie zapisanych preferencji - nigdy nie narusza Twoich aktywów w łańcuchu ani portfela.'
    },
    'tx-validity': {
      intro:
        'Transakcje Algorand są ważne tylko przez okno rund. Offset ostatniej ważnej rundy ustawia, ile rund po pierwszej ważnej rundzie Twoje transakcje wciąż mogą zostać potwierdzone.',
      steps: [
        'Otwórz Ustawienia z menu koła zębatego lub przejdź do /settings.',
        'Znajdź sekcję Konfiguracja blockchaina.',
        'Dostosuj offset ostatniej ważnej rundy (domyślnie 100).',
        'Większy offset daje transakcjom więcej czasu na potwierdzenie na wolnych połączeniach.',
        'Ustawienie jest zapisywane lokalnie i stosowane do nowych transakcji.'
      ],
      tip: 'Zwiększ offset, jeśli transakcje wygasają, zanim skończysz podpisywanie; zmniejsz go, jeśli chcesz ciaśniejsze wygasanie.'
    },
    'localnet-dev': {
      intro:
        'Localnet pozwala deweloperom uruchomić Biatec DEX na lokalnym węźle Algorand, z własnym endpointem, portem i tokenem - idealny do testowania kontraktów i procesów bez dotykania sieci publicznych.',
      steps: [
        'Uruchom swoją lokalną sieć Algorand (na przykład za pomocą AlgoKit).',
        'Otwórz menu ustawień (koło zębate) i przełącz Środowisko na Localnet.',
        'Otwórz Ustawienia i ustaw endpoint, port i token blockchaina na swój węzeł.',
        'Dostępne aktywa i pule przeładowują się dla Localnetu.',
        'Przetestuj lokalnie pełny cykl tworzenia puli, dodawania płynności i swapu.'
      ],
      tip: 'Localnet to najbezpieczniejsze miejsce do eksperymentów - tokeny i pule nie mają tam realnej wartości.'
    },
    about: {
      intro:
        'Strona O aplikacji wyjaśnia projekt: samoobsługowy AMM ze skoncentrowaną płynnością na Algorandzie, zbudowany przy wsparciu programu Algorand Foundation xGov. Wymienia też aktywa i ważne zastrzeżenia.',
      steps: [
        'Otwórz O aplikacji z menu DEX lub przejdź do /about.',
        'Przeczytaj przegląd protokołu CLAMM i agregatora DEX.',
        'Przejrzyj zastrzeżenia dotyczące samoobsługi i oprogramowania beta.',
        'Przejrzyj tabelę notowanych aktywów i przeszukaj ją.',
        'Skorzystaj z linków do dokumentacji i kodu źródłowego po więcej szczegółów.'
      ],
      tip: 'Zawsze weryfikuj każdą transakcję, którą podpisujesz - kontrakty są wciąż w aktywnym rozwoju, a Ty odpowiadasz za własne konta.'
    },
    documentation: {
      intro:
        'Poza tą wbudowaną pomocą Biatec utrzymuje zewnętrzną dokumentację i otwartą bazę kodu po głębsze szczegóły techniczne o protokole i aplikacji.',
      steps: [
        'Otwórz menu ustawień (koło zębate) i wybierz Dokumentacja, lub odwiedź stronę O aplikacji.',
        'Skorzystaj z linku Dokumentacja do docs.dex.biatec.io.',
        'Użyj linków na stronie O aplikacji do kodu źródłowego na GitHubie.',
        'Szczegóły protokołu nieujęte w tych przewodnikach znajdziesz w dokumentacji.',
        'Po przewodniki krok po kroku wróć do tego centrum pomocy.'
      ],
      tip: 'Tego centrum pomocy używaj do przewodników jak coś zrobić, a zewnętrznej dokumentacji do specyfiki protokołu i kontraktów.'
    },
    'security-best-practices': {
      intro:
        'Biatec DEX nigdy nie przechowuje Twoich aktywów, co oznacza, że bezpieczeństwo jest w Twoich rękach. Kilka nawyków drastycznie zmniejsza Twoje ryzyko przy podpisywaniu transakcji.',
      steps: [
        'Przed podpisem weryfikuj każdą transakcję w portfelu - kwoty, odbiorców oraz brak rekey i close-out.',
        'Dla dużych sald preferuj konto multisig ze sprzętowymi podpisującymi.',
        'Konta ARC-76 z e-mailem/hasłem traktuj jako najszybszą, ale najmniej bezpieczną opcję.',
        'Nigdy nie udostępniaj swojej mnemoniki ani hasła i uważaj na podobne tokeny oszustów.',
        'Przed połączeniem portfela dokładnie sprawdź, że jesteś na oficjalnej stronie.'
      ],
      tip: 'Najsilniejsza konfiguracja to multisig z 2FA na wielu urządzeniach sprzętowych (na przykład Ledger).'
    },
    'help-center': {
      intro:
        'To centrum pomocy wymienia każdą funkcję Biatec DEX jako przeszukiwalny przewodnik. Każdy przewodnik wyjaśnia funkcję krok po kroku i pokazuje zrzut ekranu w Twoim bieżącym języku.',
      steps: [
        'Otwórz Pomoc przez ikonę znaku zapytania w nagłówku.',
        'Wyszukaj lub przeglądaj kategorie, aby znaleźć temat.',
        'Otwórz przewodnik, aby przeczytać jego opis, kroki i wskazówkę.',
        'Użyj Otwórz funkcję, aby przejść bezpośrednio do tej części aplikacji.',
        'Kontynuuj naukę dzięki powiązanym przewodnikom na dole.'
      ],
      tip: 'Jeśli chcesz zrzuty i tekst pomocy w innym języku, najpierw przełącz język interfejsu.'
    }
  }
  ,
  de: {
    'explore-assets': {
      intro: 'Die Asset-Tabelle zeigt TVL, Preise, Handelsvolumen und Gebühren für alle verfügbaren Assets auf Biatec DEX.',
      steps: [
        'Öffnen Sie die Seite "Assets" über das Hauptmenü.',
        'Sortieren Sie die Tabelle durch Klicken auf eine Spaltenüberschrift (TVL, Preis, Volumen).',
        'Nutzen Sie das Suchfeld, um ein bestimmtes Asset zu finden.',
        'Klicken Sie auf ein Asset, um zur Handelsansicht zu wechseln.'
      ],
      tip: 'Sortieren Sie nach TVL, um die liquidesten Märkte zuerst zu sehen.'
    },
    'find-asset-by-id': {
      intro: 'Suchen Sie jedes Algorand Standard Asset (ASA) direkt über seine numerische Asset-ID.',
      steps: [
        'Öffnen Sie die Asset-Suche oder das Suchfeld in der Kopfzeile.',
        'Geben Sie die numerische Asset-ID ein (z. B. 31566704).',
        'Bestätigen Sie die Eingabe mit Enter oder klicken Sie auf "Suchen".',
        'Wählen Sie das gefundene Asset aus der Ergebnisliste aus.'
      ],
      tip: 'Die Asset-ID finden Sie im Algorand Explorer (z. B. algoexplorer.io oder allo.info).'
    },
    'connect-wallet': {
      intro: 'Verbinden Sie Ihr Algorand-Wallet mit Biatec DEX, um zu handeln und Liquidität bereitzustellen.',
      steps: [
        'Klicken Sie oben rechts auf "Wallet verbinden".',
        'Wählen Sie Ihren Wallet-Anbieter: Pera, Defly, Lute oder ARC-76 (E-Mail/Passwort).',
        'Folgen Sie den Anweisungen in Ihrer Wallet-App, um die Verbindung zu bestätigen.',
        'Nach erfolgreicher Verbindung wird Ihre Adresse in der Kopfzeile angezeigt.'
      ],
      tip: 'Verwenden Sie ARC-76, wenn Sie keine mobile Wallet-App installiert haben.'
    },
    'switch-language': {
      intro: 'Die Benutzeroberfläche von Biatec DEX ist in 10 Sprachen verfügbar und kann jederzeit geändert werden.',
      steps: [
        'Öffnen Sie die Einstellungen über das Menü oder die Kopfzeile.',
        'Suchen Sie den Abschnitt "Sprache".',
        'Wählen Sie Ihre gewünschte Sprache aus der Dropdown-Liste.',
        'Die Oberfläche wird sofort in der gewählten Sprache angezeigt.'
      ],
      tip: 'Die Spracheinstellung wird im Browser gespeichert und beim nächsten Besuch beibehalten.'
    },
    'switch-theme': {
      intro: 'Wechseln Sie zwischen hellem und dunklem Design, um den Komfort an Ihre Umgebung anzupassen.',
      steps: [
        'Klicken Sie auf das Themen-Symbol (Sonne/Mond) in der Kopfzeile oder den Einstellungen.',
        'Das Design wechselt sofort zwischen Hell und Dunkel.',
        'Die Einstellung wird automatisch gespeichert.'
      ],
      tip: 'Das dunkle Design schont in schwach beleuchteten Umgebungen die Augen.'
    },
    'trade-screen': {
      intro: 'Die Handelsansicht ist das zentrale Interface mit Orderformular, Kurschart, Markttiefe und aktuellen Trades.',
      steps: [
        'Wählen Sie ein Handelspaar über die Paarselektion oben.',
        'Beobachten Sie den Kurschart und die Markttiefe.',
        'Geben Sie im Orderformular den Betrag und den Slippage ein.',
        'Prüfen Sie die Transaktionsdetails und bestätigen Sie die Order.',
        'Verfolgen Sie Ihre abgeschlossenen Trades im Feed der letzten Transaktionen.'
      ],
      tip: 'Nutzen Sie die Schnellauswahl für häufig verwendete Prozentsätze des Guthabens.'
    },
    'buy-order': {
      intro: 'Platzieren Sie eine Kauforder (Swap), um ein Asset gegen ein anderes zu tauschen.',
      steps: [
        'Wählen Sie "Kaufen" im Orderformular.',
        'Geben Sie den Betrag ein, den Sie kaufen möchten.',
        'Stellen Sie den maximalen Slippage in Prozent ein.',
        'Klicken Sie auf "Kaufen" und prüfen Sie die Transaktionsvorschau.',
        'Bestätigen Sie die Transaktion in Ihrer Wallet.'
      ],
      tip: 'Ein geringerer Slippage schützt Sie vor schlechten Kursen, kann aber bei illiquiden Märkten zu Fehlern führen.'
    },
    'sell-order': {
      intro: 'Platzieren Sie eine Verkaufsorder, um ein Asset gegen ein anderes einzutauschen.',
      steps: [
        'Wählen Sie "Verkaufen" im Orderformular.',
        'Geben Sie den Betrag des zu verkaufenden Assets ein.',
        'Passen Sie den Slippage-Toleranzwert an.',
        'Klicken Sie auf "Verkaufen" und überprüfen Sie die Transaktionsdetails.',
        'Bestätigen Sie die Transaktion in Ihrer Wallet.'
      ],
      tip: 'Verwenden Sie "Max", um den gesamten verfügbaren Bestand zu verkaufen.'
    },
    'market-depth': {
      intro: 'Der Markttiefe-Chart zeigt die verfügbare Liquidität in den verschiedenen Preisbins visuell an.',
      steps: [
        'Öffnen Sie die Handelsansicht für ein Handelspaar.',
        'Scrollen Sie zum Abschnitt "Markttiefe".',
        'Fahren Sie mit der Maus über den Chart, um Liquiditätswerte an bestimmten Preispunkten zu sehen.',
        'Nutzen Sie den Chart, um Preiszonen mit hoher Liquidität zu identifizieren.'
      ],
      tip: 'Große Balken im Depth-Chart deuten auf starke Unterstützungs- oder Widerstandszonen hin.'
    },
    'recent-trades': {
      intro: 'Der Live-Feed zeigt die zuletzt ausgeführten Swaps für das aktuelle Handelspaar in Echtzeit.',
      steps: [
        'Öffnen Sie die Handelsansicht und sehen Sie den Bereich "Letzte Trades".',
        'Beobachten Sie eingehende Trades mit Preis, Menge und Zeitstempel.',
        'Käufe werden grün, Verkäufe rot dargestellt.',
        'Klicken Sie auf einen Trade, um Details zu sehen (falls verfügbar).'
      ],
      tip: 'Häufige große Trades können auf starkes Interesse an einem Asset hinweisen.'
    },
    'pool-swap': {
      intro: 'Führen Sie einen Swap direkt über einen bestimmten Liquiditätspool durch.',
      steps: [
        'Navigieren Sie zur Pool-Detailansicht.',
        'Klicken Sie auf "Swap" im Pool-Interface.',
        'Geben Sie den Tauschbetrag ein und prüfen Sie den erwarteten Ausgabebetrag.',
        'Bestätigen Sie den Swap in Ihrer Wallet.'
      ],
      tip: 'Direkte Pool-Swaps sind nützlich, wenn Sie einen bestimmten Pool nutzen möchten.'
    },
    'select-pair': {
      intro: 'Wählen Sie das Handelspaar, das Sie handeln oder für das Sie Liquidität bereitstellen möchten.',
      steps: [
        'Klicken Sie auf die Paarselektion oben in der Handelsansicht.',
        'Suchen Sie nach einem Asset-Namen oder einer Asset-ID.',
        'Wählen Sie das Basisasset und das Quotierungsasset aus.',
        'Das Interface lädt automatisch Daten für das gewählte Paar.'
      ],
      tip: 'Häufig gehandelte Paare erscheinen ganz oben in der Liste.'
    },
    'price-chart': {
      intro: 'Der OHLCV-Kerzenchart zeigt Eröffnung, Hoch, Tief und Schlusskurs sowie das Volumen für das gewählte Zeitintervall.',
      steps: [
        'Öffnen Sie die Handelsansicht und sehen Sie den Kurschart.',
        'Wählen Sie ein Zeitintervall (z. B. 1M, 5M, 1H, 1D).',
        'Fahren Sie mit der Maus über eine Kerze, um OHLCV-Details zu sehen.',
        'Zoomen Sie mit dem Scrollrad oder den Chart-Steuerelementen.'
      ],
      tip: 'Verwenden Sie längere Zeitintervalle für einen besseren Überblick über den Trend.'
    },
    'asset-info': {
      intro: 'Sehen Sie sich die Metadaten eines Assets an, einschließlich ID, Dezimalstellen und Ersteller-Adresse.',
      steps: [
        'Klicken Sie auf ein Asset in der Asset-Tabelle oder im Handelspaar.',
        'Öffnen Sie den Bereich "Asset-Info" oder "Details".',
        'Lesen Sie Asset-ID, Name, Kürzel, Dezimalstellen und Ersteller ab.',
        'Klicken Sie auf externe Links, um das Asset im Algorand Explorer anzuzeigen.'
      ],
      tip: 'Überprüfen Sie immer die Asset-ID, um sicherzustellen, dass Sie das richtige Asset handeln.'
    },
    'share-pair': {
      intro: 'Teilen Sie die aktuelle Handelspasr-URL direkt mit anderen Nutzern.',
      steps: [
        'Wählen Sie das gewünschte Handelspaar in der Handelsansicht.',
        'Klicken Sie auf das Teilen-Symbol oder die Schaltfläche "URL kopieren".',
        'Die URL wird in die Zwischenablage kopiert.',
        'Fügen Sie die URL in eine Nachricht oder ein Dokument ein.'
      ],
      tip: 'Die geteilte URL enthält Paar und Netzwerk, sodass der Empfänger dieselbe Ansicht sieht.'
    },
    'liquidity-dashboard': {
      intro: 'Das LP-Dashboard zeigt alle Ihre Liquiditätspositionen und deren Performance auf einen Blick.',
      steps: [
        'Navigieren Sie zum "Liquidität"-Bereich im Hauptmenü.',
        'Verbinden Sie Ihr Wallet, falls noch nicht geschehen.',
        'Sehen Sie alle Ihre aktiven Positionen mit TVL, Gebühren und Preisbereich.',
        'Klicken Sie auf eine Position, um Details anzuzeigen oder Liquidität zu verwalten.'
      ],
      tip: 'Überprüfen Sie regelmäßig, ob Ihre Positionen noch im aktiven Preisbereich liegen.'
    },
    'create-pool': {
      intro: 'Erstellen Sie einen neuen CLAMM-Liquiditätspool, indem Sie zwei Assets und eine Gebührenstufe auswählen.',
      steps: [
        'Klicken Sie im Liquiditäts-Dashboard auf "Pool erstellen".',
        'Wählen Sie das erste Asset (Basis) über Name oder Asset-ID.',
        'Wählen Sie das zweite Asset (Quotierung) über Name oder Asset-ID.',
        'Wählen Sie die gewünschte Gebührenstufe (0,01%, 0,05%, 0,3% oder 1%).',
        'Bestätigen Sie die Erstellung und unterschreiben Sie die Transaktion in Ihrer Wallet.'
      ],
      tip: 'Für stabile Paare eignen sich niedrige Gebührenstufen (0,01% oder 0,05%) am besten.'
    },
    'add-liquidity-focused': {
      intro: 'Die "Focused"-Form konzentriert Ihre Liquidität eng um den aktuellen Preis für maximale Kapitaleffizienz.',
      steps: [
        'Öffnen Sie "Liquidität hinzufügen" in einem Pool.',
        'Wählen Sie die Form "Focused".',
        'Geben Sie den Betrag an Liquidität ein, den Sie bereitstellen möchten.',
        'Überprüfen Sie den vorgeschlagenen engen Preisbereich.',
        'Bestätigen Sie und unterschreiben Sie die Transaktion.'
      ],
      tip: 'Focused-Liquidität erzielt höhere Gebühreneinnahmen, muss aber häufiger neu positioniert werden.'
    },
    'add-liquidity-spread': {
      intro: 'Die "Spread"-Form verteilt Ihre Liquidität über einen breiteren Preisbereich für mehr Stabilität.',
      steps: [
        'Öffnen Sie "Liquidität hinzufügen" in einem Pool.',
        'Wählen Sie die Form "Spread".',
        'Geben Sie den Liquiditätsbetrag ein.',
        'Prüfen Sie den breiteren Preisbereich und passen Sie ihn bei Bedarf an.',
        'Bestätigen und unterschreiben Sie die Transaktion.'
      ],
      tip: 'Spread-Liquidität ist weniger anfällig für Preisschwankungen, erzielt aber geringere Gebühren pro Einheit.'
    },
    'add-liquidity-equal': {
      intro: 'Die "Equal"-Form verteilt Liquidität gleichmäßig über den gesamten Preisbereich.',
      steps: [
        'Öffnen Sie "Liquidität hinzufügen" in einem Pool.',
        'Wählen Sie die Form "Equal".',
        'Geben Sie den gewünschten Liquiditätsbetrag ein.',
        'Bestätigen Sie die gleichmäßige Verteilung und unterschreiben Sie die Transaktion.'
      ],
      tip: 'Equal eignet sich gut für Einsteiger, da keine manuelle Preisbereichswahl erforderlich ist.'
    },
    'add-liquidity-single': {
      intro: 'Fügen Sie Liquidität nur mit einem einzigen Asset hinzu, ohne ein zweites Asset bereitstellen zu müssen.',
      steps: [
        'Öffnen Sie "Liquidität hinzufügen" in einem Pool.',
        'Wählen Sie die Form "Single-sided".',
        'Wählen Sie das Asset, das Sie einbringen möchten.',
        'Geben Sie den Betrag ein und überprüfen Sie die Positionszusammenfassung.',
        'Bestätigen und unterschreiben Sie die Transaktion.'
      ],
      tip: 'Einseitige Liquidität ist außerhalb des aktuellen Preises positioniert und wird erst aktiv, wenn der Kurs diesen Bereich erreicht.'
    },
    'add-liquidity-wall': {
      intro: 'Die "Wall"-Form platziert Liquidität flach auf einem bestimmten Preisniveau, ähnlich einer Limit-Order.',
      steps: [
        'Öffnen Sie "Liquidität hinzufügen" in einem Pool.',
        'Wählen Sie die Form "Wall".',
        'Legen Sie den Zielpreis (die "Mauer") fest.',
        'Geben Sie den Liquiditätsbetrag ein.',
        'Bestätigen und unterschreiben Sie die Transaktion.'
      ],
      tip: 'Wall-Liquidität verhält sich wie eine Limit-Order und ist ideal für gezielte Preisziele.'
    },
    'remove-liquidity': {
      intro: 'Heben Sie Ihre LP-Position auf und erhalten Sie beide Assets zurück in Ihr Wallet.',
      steps: [
        'Öffnen Sie das LP-Dashboard und wählen Sie die Position, die Sie schließen möchten.',
        'Klicken Sie auf "Liquidität entfernen".',
        'Wählen Sie den Prozentsatz der Position, den Sie entfernen möchten (oder 100% für vollständige Schließung).',
        'Überprüfen Sie die geschätzten erhaltenen Beträge beider Assets.',
        'Bestätigen und unterschreiben Sie die Transaktion in Ihrer Wallet.'
      ],
      tip: 'Gesammelte Gebühren werden automatisch beim Entfernen der Liquidität ausgezahlt.'
    },
    'manage-liquidity': {
      intro: 'Verwalten Sie Ihre bestehende LP-Position: sehen Sie Details, fügen Sie Liquidität hinzu oder entfernen Sie sie.',
      steps: [
        'Navigieren Sie zum LP-Dashboard und wählen Sie eine vorhandene Position.',
        'Klicken Sie auf "Position verwalten".',
        'Wählen Sie zwischen "Liquidität hinzufügen", "Liquidität entfernen" oder "Details anzeigen".',
        'Führen Sie die gewünschte Aktion aus und bestätigen Sie die Transaktion.'
      ],
      tip: 'Überprüfen Sie regelmäßig Ihren Preisbereich — außerhalb liegende Positionen verdienen keine Gebühren.'
    },
    'review-before-sign': {
      intro: 'Prüfen Sie alle Transaktionsdetails in der Vorschau, bevor Sie in Ihrer Wallet unterschreiben.',
      steps: [
        'Klicken Sie auf "Bestätigen" oder "Swap ausführen" im Interface.',
        'Lesen Sie die Transaktionszusammenfassung sorgfältig durch (Beträge, Gebühren, Assets).',
        'Stellen Sie sicher, dass Empfänger-Adresse und Beträge korrekt sind.',
        'Bestätigen Sie erst in der Wallet-App, wenn alles stimmt.'
      ],
      tip: 'Überprüfen Sie insbesondere bei hohen Beträgen jeden Parameter — Blockchain-Transaktionen sind unumkehrbar.'
    },
    'liquidity-shapes': {
      intro: 'Biatec DEX bietet 5 verschiedene Liquiditätsformen, die unterschiedliche Strategien für Liquiditätsanbieter ermöglichen.',
      steps: [
        'Öffnen Sie den Dialog "Liquidität hinzufügen" in einem beliebigen Pool.',
        'Klicken Sie auf die verschiedenen Formoptionen: Focused, Spread, Equal, Single-sided, Wall.',
        'Lesen Sie die Beschreibung jeder Form und betrachten Sie die visuelle Vorschau.',
        'Wählen Sie die Form, die Ihrer Marktstrategie am besten entspricht.',
        'Stellen Sie Liquidität mit der gewählten Form bereit.'
      ],
      tip: 'Für volatile Märkte empfiehlt sich "Spread" oder "Equal"; für stabile Märkte ist "Focused" effizienter.'
    },
    'lp-fee-tiers': {
      intro: 'Liquiditätspools auf Biatec DEX sind in vier Gebührenstufen verfügbar: 0,01%, 0,05%, 0,3% und 1%.',
      steps: [
        'Öffnen Sie "Pool erstellen" oder betrachten Sie bestehende Pools.',
        'Prüfen Sie die Gebührenstufe des Pools (in der Pool-Übersicht oder beim Erstellen).',
        'Wählen Sie beim Erstellen die Stufe, die zum erwarteten Volatilitätsniveau passt.',
        'Beachten Sie, dass höhere Gebühren höhere Einnahmen bedeuten, aber weniger Handelsvolumen anziehen können.'
      ],
      tip: '0,3% ist die häufigste Gebührenstufe für Standard-Kryptopaar-Pools.'
    },
    'price-range': {
      intro: 'Legen Sie einen benutzerdefinierten Preisbereich fest, in dem Ihre Liquidität aktiv ist und Gebühren verdient.',
      steps: [
        'Öffnen Sie "Liquidität hinzufügen" in einem Pool.',
        'Navigieren Sie zur Preisbereich-Einstellung.',
        'Geben Sie den Mindest- und Höchstpreis manuell ein oder nutzen Sie die Schieberegler.',
        'Überprüfen Sie den Bereich im Verhältnis zum aktuellen Marktpreis.',
        'Bestätigen Sie den Preisbereich und schließen Sie die Liquiditätsbereitstellung ab.'
      ],
      tip: 'Ein engerer Preisbereich erhöht die Kapitaleffizienz, birgt aber das Risiko, außerhalb des aktiven Bereichs zu geraten.'
    },
    'precision-bins': {
      intro: 'Konfigurieren Sie die Bin-Schrittgröße (Preispräzision) beim Erstellen eines neuen Pools.',
      steps: [
        'Öffnen Sie den Dialog "Pool erstellen".',
        'Suchen Sie die Einstellung für Bin-Schritt oder Preispräzision.',
        'Wählen Sie einen kleineren Wert für feinere Preisstufen oder einen größeren für grobe Stufen.',
        'Bestätigen Sie die Einstellung und erstellen Sie den Pool.'
      ],
      tip: 'Kleinere Bin-Schritte ermöglichen präzisere Preispositionierung, erhöhen aber die Transaktionskomplexität.'
    },
    'pool-costs-mbr': {
      intro: 'Das Erstellen und Nutzen eines Pools auf Algorand erfordert Mindestguthaben-Reservierungen (MBR) in ALGO.',
      steps: [
        'Informieren Sie sich vor der Pool-Erstellung über die anfallenden MBR-Kosten.',
        'Stellen Sie sicher, dass Ihr Wallet ausreichend ALGO für MBR und Transaktionsgebühren enthält.',
        'Überprüfen Sie die Kostenzusammenfassung im Dialog "Pool erstellen".',
        'Bestätigen Sie die Transaktion und stellen Sie sicher, dass das ALGO-Guthaben nach Abzug der MBR ausreicht.'
      ],
      tip: 'MBR-Reservierungen werden zurückerstattet, wenn der Pool geschlossen wird.'
    },
    'trader-dashboard': {
      intro: 'Das Trader-Dashboard zeigt Ihre persönliche Handelshistorie, Statistiken und Performance.',
      steps: [
        'Verbinden Sie Ihr Wallet.',
        'Navigieren Sie zum "Trader"-Dashboard im Hauptmenü.',
        'Sehen Sie Ihre abgeschlossenen Trades, Volumen und Gebühren.',
        'Filtern Sie nach Zeitraum oder Handelspaar für detailliertere Auswertungen.'
      ],
      tip: 'Nutzen Sie das Dashboard, um Ihre Handelsgewohnheiten zu analysieren und zu verbessern.'
    },
    'asset-opt-in': {
      intro: 'Auf Algorand müssen Sie sich für ein ASA einschreiben (Opt-in), bevor Sie es empfangen oder handeln können.',
      steps: [
        'Navigieren Sie zu "Asset Opt-in" im Menü.',
        'Suchen Sie nach dem gewünschten Asset per Name oder ID.',
        'Klicken Sie auf "Opt-in" neben dem Asset.',
        'Bestätigen Sie die Opt-in-Transaktion in Ihrer Wallet.',
        'Das Asset ist nun in Ihrem Wallet empfangbar.'
      ],
      tip: 'Jeder Opt-in reserviert 0,1 ALGO in Ihrem Wallet als MBR.'
    },
    'copy-address': {
      intro: 'Kopieren Sie Ihre Algorand-Wallet-Adresse direkt aus dem Interface.',
      steps: [
        'Stellen Sie sicher, dass Ihr Wallet verbunden ist.',
        'Klicken Sie auf Ihre Adresse oder das Kopieren-Symbol in der Kopfzeile.',
        'Die Adresse wird in die Zwischenablage kopiert.',
        'Fügen Sie die Adresse in das Zielfeld ein.'
      ],
      tip: 'Überprüfen Sie die kopierten Zeichen am Anfang und Ende der Adresse zur Sicherheit.'
    },
    'disconnect-wallet': {
      intro: 'Trennen Sie Ihr Wallet sicher von Biatec DEX.',
      steps: [
        'Klicken Sie auf Ihre Wallet-Adresse oder das Wallet-Symbol in der Kopfzeile.',
        'Wählen Sie "Wallet trennen" oder "Abmelden" im Dropdown-Menü.',
        'Bestätigen Sie die Aktion, falls eine Bestätigung erscheint.',
        'Ihr Wallet ist nun getrennt und keine Transaktionen können mehr signiert werden.'
      ],
      tip: 'Trennen Sie immer Ihr Wallet, wenn Sie einen gemeinsam genutzten Computer verwenden.'
    },
    'switch-network': {
      intro: 'Wechseln Sie zwischen Mainnet, Testnet und Localnet für Entwicklung und Tests.',
      steps: [
        'Öffnen Sie die Netzwerkauswahl in der Kopfzeile oder den Einstellungen.',
        'Wählen Sie das gewünschte Netzwerk: Mainnet, Testnet oder Localnet.',
        'Bestätigen Sie den Netzwerkwechsel.',
        'Das Interface lädt Assets und Pools für das neue Netzwerk neu.'
      ],
      tip: 'Verwenden Sie Testnet, um neue Funktionen risikofrei auszuprobieren.'
    },
    'settings-blockchain': {
      intro: 'Konfigurieren Sie benutzerdefinierte Node-URLs, Indexer-URLs und API-Schlüssel für die Algorand-Verbindung.',
      steps: [
        'Öffnen Sie die Einstellungen über das Menü.',
        'Navigieren Sie zu "Blockchain" oder "Netzwerk"-Einstellungen.',
        'Geben Sie die gewünschte Node-URL und Indexer-URL ein.',
        'Falls erforderlich, fügen Sie Ihren API-Schlüssel hinzu.',
        'Speichern Sie die Einstellungen und prüfen Sie die Verbindung.'
      ],
      tip: 'Verwenden Sie einen eigenen Algorand-Node für maximale Zuverlässigkeit und Datenschutz.'
    },
    'settings-swap': {
      intro: 'Konfigurieren Sie Standard-Slippage und weitere Swap-Parameter nach Ihren Präferenzen.',
      steps: [
        'Öffnen Sie die Einstellungen.',
        'Navigieren Sie zu "Swap-Einstellungen".',
        'Stellen Sie den Standard-Slippage-Wert ein (z. B. 0,5% oder 1%).',
        'Passen Sie weitere Parameter wie bevorzugte Pools an.',
        'Speichern Sie die Einstellungen.'
      ],
      tip: 'Ein Slippage von 0,5% ist für die meisten Handelssituationen ein guter Ausgangswert.'
    },
    'reset-settings': {
      intro: 'Setzen Sie alle Einstellungen auf die Standardwerte zurück, falls etwas nicht wie erwartet funktioniert.',
      steps: [
        'Öffnen Sie die Einstellungen.',
        'Scrollen Sie zum Ende der Einstellungsseite.',
        'Klicken Sie auf "Einstellungen zurücksetzen".',
        'Bestätigen Sie den Reset in der Bestätigungsabfrage.',
        'Alle Einstellungen werden auf die Standardwerte zurückgesetzt.'
      ],
      tip: 'Nach dem Zurücksetzen müssen Node-URLs und andere individuelle Konfigurationen erneut eingegeben werden.'
    },
    'tx-validity': {
      intro: 'Legen Sie fest, wie viele Algorand-Runden eine Transaktion gültig bleibt, bevor sie abläuft.',
      steps: [
        'Öffnen Sie die Einstellungen.',
        'Suchen Sie die Option "Transaktionsgültigkeit" oder "Validity Rounds".',
        'Geben Sie die gewünschte Anzahl an Runden ein.',
        'Speichern Sie die Einstellung.'
      ],
      tip: 'Der Standardwert von 1000 Runden (ca. 50 Minuten) reicht für die meisten Anwendungsfälle aus.'
    },
    'localnet-dev': {
      intro: 'Starten Sie ein lokales Algorand-Netzwerk für Entwicklung und Tests ohne echte ALGO zu benötigen.',
      steps: [
        'Installieren Sie AlgoKit und starten Sie das lokale Netzwerk mit "algokit localnet start".',
        'Wechseln Sie in Biatec DEX zum Netzwerk "Localnet".',
        'Konfigurieren Sie Node- und Indexer-URL auf localhost.',
        'Deployen Sie Contracts und führen Sie Tests durch.'
      ],
      tip: 'Localnet setzt sich mit "algokit localnet reset" zurück — ideal für saubere Testläufe.'
    },
    'about': {
      intro: 'Sehen Sie die aktuelle App-Version, Team-Informationen und offizielle Links zu Biatec DEX.',
      steps: [
        'Öffnen Sie das Hauptmenü oder die Informationsseite.',
        'Navigieren Sie zu "Über" oder "Info".',
        'Lesen Sie Versionsnummer, Team-Informationen und Projektlinks.',
        'Klicken Sie auf externe Links für GitHub, Dokumentation oder Community.'
      ],
      tip: 'Notieren Sie die Versionsnummer, wenn Sie Support anfragen oder Fehler melden.'
    },
    'documentation': {
      intro: 'Die offizielle Biatec DEX Dokumentation enthält ausführliche Anleitungen, API-Referenzen und Konzepterklärungen.',
      steps: [
        'Klicken Sie auf "Dokumentation" im Menü oder Footer.',
        'Wählen Sie den gewünschten Bereich (Trader, LP, Entwickler).',
        'Nutzen Sie die Suchfunktion für spezifische Themen.',
        'Lesen Sie die Anleitungen und Beispiele durch.'
      ],
      tip: 'Lesezeichen für häufig benötigte Abschnitte der Dokumentation sparen Zeit.'
    },
    'security-best-practices': {
      intro: 'Beachten Sie diese Sicherheitshinweise, um Ihr Wallet und Ihre Assets auf Biatec DEX zu schützen.',
      steps: [
        'Überprüfen Sie immer alle Transaktionsdetails, bevor Sie in der Wallet unterschreiben.',
        'Verwenden Sie wenn möglich Multisig-Wallets für große Beträge.',
        'Geben Sie niemals Ihre Mnemonic-Phrase (Seed-Phrase) an Dritte weiter oder geben Sie sie auf Websites ein.',
        'Überprüfen Sie die URL der App, um Phishing-Seiten zu vermeiden.',
        'Trennen Sie Ihr Wallet, wenn Sie einen gemeinsam genutzten Computer verwenden.'
      ],
      tip: 'Hardware-Wallets bieten die höchste Sicherheit für größere Bestände.'
    },
    'help-center': {
      intro: 'Das Hilfezentrum bietet Anleitungen zu allen Funktionen von Biatec DEX — von der Wallet-Verbindung bis zur Liquiditätsverwaltung.',
      steps: [
        'Öffnen Sie das Hilfezentrum über das Fragezeichen-Symbol oder das Menü.',
        'Suchen Sie nach einem Thema oder stöbern Sie in den Kategorien.',
        'Klicken Sie auf einen Artikel, um die Schritt-für-Schritt-Anleitung zu lesen.',
        'Folgen Sie den Schritten direkt in der App.'
      ],
      tip: 'Nutzen Sie die Suche im Hilfezentrum, um schnell die passende Anleitung zu finden.'
    }
  }
  ,
  es: {
    'explore-assets': {
      intro: 'Explora la tabla de activos disponibles con información sobre TVL, precios, volumen en 24 horas y comisiones. Encuentra rápidamente los pares más activos del mercado.',
      steps: [
        'Navega a la sección de activos desde el menú principal.',
        'Revisa las columnas de TVL, precio actual y volumen en 24 horas.',
        'Haz clic en el encabezado de una columna para ordenar la tabla.',
        'Usa el campo de búsqueda para filtrar activos por nombre o ID.',
        'Haz clic en un activo para ir directamente a su par de trading.'
      ],
      tip: 'Ordena por volumen en 24 horas para descubrir los activos más negociados del día.'
    },
    'find-asset-by-id': {
      intro: 'Busca cualquier ASA de Algorand introduciendo su ID numérico. Ideal cuando conoces el identificador exacto del activo.',
      steps: [
        'Abre el buscador de activos desde la barra de navegación.',
        'Introduce el ID numérico del ASA en el campo de búsqueda.',
        'Espera a que el sistema recupere los datos del activo.',
        'Verifica el nombre y los decimales del activo antes de continuar.',
        'Selecciona el activo para añadirlo a tu par de trading.'
      ],
      tip: 'Puedes encontrar el ID de un ASA en AlgoExplorer o en el explorador oficial de Algorand.'
    },
    'connect-wallet': {
      intro: 'Conecta tu billetera Pera, Defly o Lute, o autentícate mediante correo electrónico y contraseña con ARC-76. La conexión es necesaria para operar y gestionar liquidez.',
      steps: [
        'Haz clic en el botón "Conectar billetera" en la parte superior de la pantalla.',
        'Selecciona tu proveedor de billetera: Pera, Defly, Lute u otro compatible.',
        'Si usas ARC-76, introduce tu correo electrónico y contraseña.',
        'Aprueba la solicitud de conexión en tu billetera.',
        'Verifica que tu dirección aparezca correctamente en la cabecera.'
      ],
      tip: 'Usa Pera Wallet en móvil para una experiencia fluida con código QR.'
    },
    'switch-language': {
      intro: 'Cambia el idioma de la interfaz desde los ajustes o el selector del encabezado. La plataforma está disponible en 10 idiomas.',
      steps: [
        'Haz clic en el ícono de idioma o ve a Ajustes.',
        'Selecciona tu idioma preferido de la lista disponible.',
        'La interfaz se actualizará automáticamente al idioma elegido.',
        'Si encuentras una traducción incorrecta, puedes reportarla al equipo.'
      ],
      tip: 'El idioma seleccionado se guarda en tu navegador y se aplica en futuras visitas.'
    },
    'switch-theme': {
      intro: 'Alterna entre el tema claro y oscuro usando el ícono de luna o sol en la cabecera. Elige el modo que más se adapte a tu entorno.',
      steps: [
        'Localiza el ícono de luna (modo oscuro) o sol (modo claro) en la cabecera.',
        'Haz clic en el ícono para cambiar entre los temas.',
        'El tema se aplica de inmediato sin necesidad de recargar la página.',
        'Tu preferencia se guardará para futuras sesiones.'
      ],
      tip: 'El modo oscuro reduce la fatiga visual en sesiones largas de trading.'
    },
    'trade-screen': {
      intro: 'La pantalla principal de trading incluye el formulario de órdenes, gráfico de precios, profundidad de mercado y operaciones recientes. Todo en un solo lugar para operar con eficiencia.',
      steps: [
        'Selecciona el par de activos que deseas operar.',
        'Revisa el gráfico OHLCV para analizar el precio histórico.',
        'Consulta la profundidad de mercado para ver la liquidez disponible.',
        'Introduce el monto en el formulario de orden y ajusta el deslizamiento.',
        'Confirma la operación y fírmala en tu billetera.'
      ],
      tip: 'Mantén la pestaña de operaciones recientes visible para monitorear la actividad del mercado en tiempo real.'
    },
    'buy-order': {
      intro: 'Coloca una orden de compra (swap) especificando el monto y el deslizamiento máximo aceptable. La orden se ejecuta a través de los pools de liquidez disponibles.',
      steps: [
        'Asegúrate de tener el activo de origen en tu billetera.',
        'Selecciona el par de trading deseado.',
        'Introduce el monto que deseas comprar o el monto a gastar.',
        'Ajusta el porcentaje de deslizamiento según las condiciones del mercado.',
        'Haz clic en "Comprar" y confirma la transacción en tu billetera.'
      ],
      tip: 'Un deslizamiento del 0.5% es adecuado para pares con alta liquidez; aumenta a 1-2% para activos menos líquidos.'
    },
    'sell-order': {
      intro: 'Vende un activo especificando la cantidad a vender y el deslizamiento máximo. La orden se enruta automáticamente por los mejores pools disponibles.',
      steps: [
        'Selecciona el par de trading y elige la dirección de venta.',
        'Introduce el monto del activo que deseas vender.',
        'Revisa el precio estimado de salida y el impacto en el precio.',
        'Configura el deslizamiento máximo tolerable.',
        'Confirma la venta y firma la transacción en tu billetera.'
      ],
      tip: 'Verifica el impacto en el precio antes de vender grandes cantidades para evitar deslizamientos inesperados.'
    },
    'market-depth': {
      intro: 'El gráfico de profundidad de mercado muestra la liquidez disponible en distintos niveles de precio. Ayuda a identificar zonas de soporte y resistencia.',
      steps: [
        'Accede a la pestaña de profundidad de mercado en la pantalla de trading.',
        'Observa las áreas de compra (verde) y venta (rojo) en el gráfico.',
        'Pasa el cursor sobre el gráfico para ver la liquidez acumulada en cada precio.',
        'Identifica los niveles de precio con mayor concentración de liquidez.',
        'Usa esta información para estimar el impacto de tu orden antes de ejecutarla.'
      ],
      tip: 'Una brecha grande en el gráfico indica un rango de precio con poca liquidez, donde el deslizamiento puede ser alto.'
    },
    'recent-trades': {
      intro: 'El feed de operaciones recientes muestra los swaps ejecutados en tiempo real. Es útil para monitorear la actividad del mercado y los precios de ejecución.',
      steps: [
        'Localiza el panel de operaciones recientes en la pantalla de trading.',
        'Observa el precio, monto y dirección de cada operación.',
        'Las operaciones de compra se muestran en verde y las de venta en rojo.',
        'El feed se actualiza automáticamente con nuevas transacciones.',
        'Haz clic en una transacción para verla en el explorador de bloques.'
      ],
      tip: 'Un flujo constante de operaciones indica alta actividad y mejor liquidez en el par.'
    },
    'pool-swap': {
      intro: 'Realiza un swap de tokens a través de un pool de liquidez específico. Útil cuando quieres operar directamente en un pool determinado.',
      steps: [
        'Navega al pool de liquidez que deseas usar.',
        'Selecciona los tokens de entrada y salida.',
        'Introduce el monto del swap.',
        'Revisa la tasa de cambio y las comisiones del pool.',
        'Confirma el swap y firma en tu billetera.'
      ],
      tip: 'Los pools con mayor TVL generalmente ofrecen mejores tasas y menor deslizamiento.'
    },
    'select-pair': {
      intro: 'Selecciona el par de activos que deseas operar desde el selector de pares. Puedes buscar por nombre de activo o ID.',
      steps: [
        'Haz clic en el selector de par en la pantalla de trading.',
        'Busca el activo escribiendo su nombre o ID numérico.',
        'Selecciona el activo base y el activo de cotización.',
        'El gráfico y el libro de órdenes se actualizarán automáticamente.',
        'Tu selección se refleja en la URL para compartir fácilmente.'
      ],
      tip: 'Guarda tus pares favoritos marcándolos con una estrella para acceso rápido.'
    },
    'price-chart': {
      intro: 'El gráfico de precios OHLCV con velas japonesas permite analizar la evolución del precio en distintos marcos temporales. Fundamental para el análisis técnico.',
      steps: [
        'Accede al gráfico en la pantalla principal de trading.',
        'Selecciona el marco temporal deseado: 1m, 5m, 15m, 1h, 4h, 1d.',
        'Usa el ratón para hacer zoom y desplazarte por el historial de precios.',
        'Observa los patrones de velas para identificar tendencias.',
        'Combina el análisis del gráfico con la profundidad de mercado para mejores decisiones.'
      ],
      tip: 'El marco temporal de 1 hora es ideal para encontrar niveles clave de soporte y resistencia a mediano plazo.'
    },
    'asset-info': {
      intro: 'Consulta los metadatos de un activo, incluido su ID, decimales y creador. Información esencial para verificar la autenticidad del activo.',
      steps: [
        'Haz clic en el nombre o ícono del activo en la pantalla de trading.',
        'Se abrirá un panel con los detalles del activo.',
        'Verifica el ID del ASA, el número de decimales y la dirección del creador.',
        'Usa el enlace al explorador para ver más información en la cadena.',
        'Confirma que el activo es legítimo antes de operar.'
      ],
      tip: 'Siempre verifica el ID del ASA para evitar confundirte con tokens fraudulentos de nombre similar.'
    },
    'share-pair': {
      intro: 'Comparte la URL del par de trading actual con un clic. El enlace incluye los parámetros del par para que otros accedan directamente.',
      steps: [
        'Selecciona el par de trading que deseas compartir.',
        'Haz clic en el ícono de compartir o copiar enlace.',
        'La URL se copiará automáticamente al portapapeles.',
        'Pega el enlace en el medio que prefieras: chat, correo o redes sociales.',
        'El destinatario abrirá el par directamente al acceder al enlace.'
      ],
      tip: 'Comparte pares con alta liquidez para atraer a nuevos proveedores de liquidez al pool.'
    },
    'liquidity-dashboard': {
      intro: 'El panel de proveedor de liquidez muestra todas tus posiciones activas, comisiones acumuladas y rendimiento. Gestiona tu liquidez desde un único lugar.',
      steps: [
        'Conecta tu billetera para acceder al panel de liquidez.',
        'Revisa la lista de tus posiciones activas y su valor actual.',
        'Consulta las comisiones acumuladas en cada posición.',
        'Haz clic en una posición para ver sus detalles o gestionarla.',
        'Usa los botones de acción para añadir o retirar liquidez.'
      ],
      tip: 'Revisa tu panel regularmente para asegurarte de que tus posiciones estén dentro del rango de precio activo.'
    },
    'create-pool': {
      intro: 'Crea un nuevo pool CLAMM seleccionando los activos y el nivel de comisión. La creación de un pool requiere pagar el MBR de Algorand.',
      steps: [
        'Ve al panel de liquidez y haz clic en "Crear pool".',
        'Selecciona el activo base y el activo de cotización.',
        'Elige el nivel de comisión del pool: 0.01%, 0.05%, 0.3% o 1%.',
        'Revisa los costos de MBR requeridos.',
        'Confirma la creación y firma las transacciones en tu billetera.'
      ],
      tip: 'Elige una comisión baja para activos estables y una comisión alta para activos volátiles.'
    },
    'add-liquidity-focused': {
      intro: 'Añade liquidez en forma Concentrada alrededor del precio actual del mercado. Esta forma maximiza las comisiones en condiciones de mercado estable.',
      steps: [
        'Selecciona "Añadir liquidez" en el pool deseado.',
        'Elige la forma "Concentrada" (Focused).',
        'Revisa el rango de precio generado automáticamente alrededor del precio actual.',
        'Introduce los montos de ambos activos que deseas depositar.',
        'Confirma y firma la transacción en tu billetera.'
      ],
      tip: 'La forma concentrada genera más comisiones, pero requiere rebalanceo más frecuente si el precio se mueve.'
    },
    'add-liquidity-spread': {
      intro: 'Añade liquidez en forma Dispersa cubriendo un rango de precios más amplio. Reduce el riesgo de quedar fuera de rango, pero con menor eficiencia de capital.',
      steps: [
        'Selecciona "Añadir liquidez" y elige la forma "Dispersa" (Spread).',
        'Observa el rango de precio más amplio que cubre esta forma.',
        'Introduce los montos de los activos a depositar.',
        'Revisa la distribución de liquidez en el gráfico de vista previa.',
        'Confirma y firma la transacción.'
      ],
      tip: 'La forma dispersa es ideal para activos con alta volatilidad donde el precio varía significativamente.'
    },
    'add-liquidity-equal': {
      intro: 'Añade liquidez en forma Uniforme cubriendo todo el rango de precios por igual. La opción más sencilla y similar a un AMM tradicional.',
      steps: [
        'Selecciona "Añadir liquidez" y elige la forma "Uniforme" (Equal).',
        'La liquidez se distribuirá de manera uniforme en todo el rango.',
        'Introduce los montos de ambos activos.',
        'Revisa el resumen antes de confirmar.',
        'Firma la transacción en tu billetera.'
      ],
      tip: 'La forma uniforme es la más sencilla para principiantes, ya que no requiere gestión activa del rango.'
    },
    'add-liquidity-single': {
      intro: 'Añade liquidez con un solo activo. El sistema ajusta la posición para usar únicamente el token seleccionado.',
      steps: [
        'Selecciona "Añadir liquidez" y elige la opción "Un solo activo" (Single-sided).',
        'Selecciona el activo que deseas depositar.',
        'Introduce el monto a depositar.',
        'Revisa el rango de precio asignado para tu posición.',
        'Confirma y firma la transacción en tu billetera.'
      ],
      tip: 'La liquidez de un solo activo es útil cuando solo tienes uno de los tokens del par.'
    },
    'add-liquidity-wall': {
      intro: 'Añade liquidez en forma Muro (Wall) concentrando toda la liquidez en un precio fijo específico. Actúa como una orden limitada pasiva.',
      steps: [
        'Selecciona "Añadir liquidez" y elige la forma "Muro" (Wall).',
        'Especifica el precio exacto donde deseas concentrar la liquidez.',
        'Introduce el monto del activo a depositar.',
        'Revisa la distribución de liquidez en un único bin de precio.',
        'Confirma y firma la transacción en tu billetera.'
      ],
      tip: 'Usa la forma Muro para colocar liquidez como si fuera una orden limitada en un precio objetivo.'
    },
    'remove-liquidity': {
      intro: 'Retira tu posición de liquidez y recibe ambos activos de vuelta en tu billetera. Puedes retirar parcial o totalmente.',
      steps: [
        'Ve al panel de liquidez y selecciona la posición que deseas retirar.',
        'Haz clic en "Retirar liquidez".',
        'Selecciona el porcentaje que deseas retirar: 25%, 50%, 75% o 100%.',
        'Revisa los montos estimados de cada activo que recibirás.',
        'Confirma y firma la transacción en tu billetera.'
      ],
      tip: 'Retira liquidez antes de que el precio salga completamente de tu rango para evitar pérdidas por divergencia.'
    },
    'manage-liquidity': {
      intro: 'Gestiona tu posición de liquidez existente, visualiza su rendimiento y realiza ajustes. Accede a todos los detalles de tu posición desde aquí.',
      steps: [
        'Accede al panel de liquidez con tu billetera conectada.',
        'Selecciona la posición que deseas gestionar.',
        'Revisa el valor actual, las comisiones acumuladas y el rango de precio.',
        'Decide si deseas añadir más liquidez, retirar o mantener la posición.',
        'Ejecuta la acción deseada y firma en tu billetera.'
      ],
      tip: 'Si tu posición está fuera de rango, considera retirarla y crear una nueva en el rango de precio actual.'
    },
    'review-before-sign': {
      intro: 'Revisa siempre los detalles de la transacción antes de firmar en tu billetera. Este paso es crucial para evitar errores costosos.',
      steps: [
        'Antes de confirmar cualquier operación, lee el resumen de la transacción.',
        'Verifica los activos involucrados, los montos y las comisiones.',
        'Comprueba la dirección de destino si aplica.',
        'Revisa el deslizamiento máximo permitido.',
        'Solo firma si todos los detalles son correctos.'
      ],
      tip: 'Nunca firmes una transacción que no entiendes completamente; cancela y pide ayuda si tienes dudas.'
    },
    'liquidity-shapes': {
      intro: 'Biatec DEX ofrece 5 formas de liquidez para adaptarse a distintas estrategias de mercado. Cada forma tiene ventajas según las condiciones del activo.',
      steps: [
        'Accede a la sección de añadir liquidez para ver las formas disponibles.',
        'Lee la descripción de cada forma: Concentrada, Dispersa, Uniforme, Un solo activo y Muro.',
        'Considera la volatilidad del activo al elegir la forma.',
        'Selecciona la forma que mejor se adapte a tu estrategia.',
        'Consulta los tutoriales individuales de cada forma para más detalles.'
      ],
      tip: 'Combina distintas formas en el mismo par para diversificar tu estrategia de provisión de liquidez.'
    },
    'lp-fee-tiers': {
      intro: 'Los pools de Biatec DEX ofrecen cuatro niveles de comisión: 0.01%, 0.05%, 0.3% y 1%. Elige el nivel adecuado según la volatilidad del par.',
      steps: [
        'Al crear o seleccionar un pool, revisa el nivel de comisión disponible.',
        'Considera 0.01% para pares de stablecoins con mínima volatilidad.',
        'Usa 0.05% para pares de activos líquidos con baja volatilidad.',
        'Selecciona 0.3% para la mayoría de los pares de activos estándar.',
        'Elige 1% para activos muy volátiles o con baja liquidez.'
      ],
      tip: 'Un nivel de comisión más alto compensa el mayor riesgo de pérdida por divergencia en activos volátiles.'
    },
    'price-range': {
      intro: 'Define un rango de precio personalizado para tu posición de liquidez. Tu capital solo generará comisiones cuando el precio esté dentro de este rango.',
      steps: [
        'En el formulario de añadir liquidez, selecciona la opción de rango personalizado.',
        'Introduce el precio mínimo del rango.',
        'Introduce el precio máximo del rango.',
        'Revisa el gráfico para visualizar el rango seleccionado.',
        'Ajusta los valores si es necesario y confirma la posición.'
      ],
      tip: 'Un rango más estrecho genera más comisiones por unidad de capital, pero aumenta el riesgo de quedar fuera de rango.'
    },
    'precision-bins': {
      intro: 'Configura el paso de bins y la precisión de precio para un pool. Este parámetro determina la granularidad de los niveles de precio disponibles.',
      steps: [
        'Al crear un pool, busca la opción de paso de bin (bin step).',
        'Selecciona un valor menor para mayor precisión de precio.',
        'Considera que bins más pequeños requieren más transacciones para cubrir un rango amplio.',
        'Revisa el impacto del paso de bin en la eficiencia del pool.',
        'Confirma el parámetro antes de finalizar la creación del pool.'
      ],
      tip: 'Un paso de bin de 1 bp (0.01%) es ideal para pares estables; usa valores mayores para activos volátiles.'
    },
    'pool-costs-mbr': {
      intro: 'La creación de pools y posiciones en Algorand requiere un depósito mínimo de saldo (MBR). Estos ALGO se bloquean en el contrato y se recuperan al cerrar la posición.',
      steps: [
        'Antes de crear un pool, verifica que tienes suficiente ALGO para cubrir el MBR.',
        'Revisa el desglose de costos de MBR en el formulario de creación.',
        'Ten en cuenta que cada nueva posición también requiere su propio MBR.',
        'El MBR se devuelve al retirar completamente la liquidez o cerrar el pool.',
        'Mantén siempre un pequeño saldo extra de ALGO en tu billetera para comisiones de transacción.'
      ],
      tip: 'El MBR no es una comisión; es un depósito recuperable que garantiza el almacenamiento en la cadena de Algorand.'
    },
    'trader-dashboard': {
      intro: 'El panel de trader muestra tus estadísticas personales de trading e historial de operaciones. Útil para revisar tu rendimiento y actividad pasada.',
      steps: [
        'Conecta tu billetera para acceder al panel de trader.',
        'Revisa el resumen de tu volumen de trading y operaciones recientes.',
        'Filtra el historial por par de activos o rango de fechas.',
        'Analiza tus estadísticas para identificar patrones en tu actividad.',
        'Exporta el historial si necesitas los datos para contabilidad o impuestos.'
      ],
      tip: 'Revisa regularmente tus estadísticas para evaluar tu estrategia de trading y mejorar continuamente.'
    },
    'asset-opt-in': {
      intro: 'En Algorand, debes hacer opt-in a un ASA antes de poder recibirlo. Este proceso reserva espacio en tu cuenta para el nuevo activo.',
      steps: [
        'Ve a la sección de opt-in de activos.',
        'Busca el activo por nombre o ID.',
        'Verifica que el activo es legítimo antes de continuar.',
        'Haz clic en "Opt-in" y firma la transacción en tu billetera.',
        'El activo aparecerá en tu cuenta con saldo cero tras el opt-in.'
      ],
      tip: 'Cada opt-in requiere un MBR de 0.1 ALGO; haz opt-in solo a activos en los que confíes.'
    },
    'copy-address': {
      intro: 'Copia tu dirección de billetera de Algorand con un clic para compartirla o usarla en otras aplicaciones.',
      steps: [
        'Localiza tu dirección de billetera en la cabecera o en el menú de cuenta.',
        'Haz clic en el ícono de copiar junto a tu dirección.',
        'La dirección se copiará al portapapeles automáticamente.',
        'Pega la dirección donde la necesites.',
        'Verifica siempre los primeros y últimos caracteres al pegar en transacciones.'
      ],
      tip: 'Verifica los primeros y últimos 4-6 caracteres de la dirección cada vez que la uses para confirmar su integridad.'
    },
    'disconnect-wallet': {
      intro: 'Desconecta tu billetera de la aplicación cuando termines de operar. Buena práctica de seguridad especialmente en dispositivos compartidos.',
      steps: [
        'Haz clic en tu dirección de billetera o en el menú de cuenta.',
        'Selecciona la opción "Desconectar" o "Cerrar sesión".',
        'Confirma la desconexión si se solicita.',
        'Verifica que la interfaz vuelve al estado de billetera desconectada.',
        'Cierra también la sesión en tu aplicación de billetera si estás en un dispositivo compartido.'
      ],
      tip: 'Desconectar la billetera en la DApp no cierra tu billetera; tu cuenta de Algorand sigue segura.'
    },
    'switch-network': {
      intro: 'Cambia entre Mainnet, Testnet y Localnet desde los ajustes. Usa Testnet para probar sin arriesgar fondos reales.',
      steps: [
        'Ve a los ajustes de la aplicación.',
        'Localiza la opción de selección de red.',
        'Elige entre Mainnet, Testnet o Localnet.',
        'Confirma el cambio; la aplicación se recargará con los datos de la nueva red.',
        'Verifica que tu billetera también esté configurada en la misma red.'
      ],
      tip: 'Siempre usa Testnet para experimentar con nuevas estrategias antes de aplicarlas en Mainnet.'
    },
    'settings-blockchain': {
      intro: 'Configura la URL del nodo de Algorand, el indexador y la clave de API. Necesario para usuarios avanzados que deseen usar su propio nodo.',
      steps: [
        'Ve a Ajustes y selecciona la pestaña de configuración de blockchain.',
        'Introduce la URL de tu nodo de Algorand (algod).',
        'Introduce la URL del indexador si dispones de uno propio.',
        'Añade tu clave de API si el nodo lo requiere.',
        'Guarda los cambios y verifica la conexión.'
      ],
      tip: 'Usar tu propio nodo mejora la privacidad y la velocidad de respuesta de la aplicación.'
    },
    'settings-swap': {
      intro: 'Configura el deslizamiento predeterminado y otros parámetros de swap. Ajusta estos valores según tu estilo de trading.',
      steps: [
        'Ve a Ajustes y selecciona la pestaña de configuración de swap.',
        'Establece tu tolerancia de deslizamiento predeterminada.',
        'Configura otros parámetros de swap disponibles.',
        'Guarda los cambios.',
        'Los nuevos valores se aplicarán en futuros swaps automáticamente.'
      ],
      tip: 'Un deslizamiento demasiado bajo puede causar que tus transacciones fallen; 0.5% es un buen punto de partida.'
    },
    'reset-settings': {
      intro: 'Restablece todos los ajustes a sus valores predeterminados. Útil para resolver problemas de configuración o empezar desde cero.',
      steps: [
        'Ve a la sección de Ajustes.',
        'Busca la opción "Restablecer ajustes" al final de la página.',
        'Lee la advertencia sobre los ajustes que se perderán.',
        'Confirma el restablecimiento haciendo clic en el botón correspondiente.',
        'La aplicación volverá a la configuración predeterminada de fábrica.'
      ],
      tip: 'Anota tu configuración personalizada antes de restablecer para poder recuperarla fácilmente.'
    },
    'tx-validity': {
      intro: 'Configura los rondas de validez de las transacciones de Algorand. Define cuántos bloques tiene una transacción para ser incluida en la cadena.',
      steps: [
        'Ve a Ajustes y busca la opción de validez de transacciones.',
        'Introduce el número de rondas de validez deseado.',
        'Considera que un valor mayor da más tiempo para que la transacción se confirme.',
        'Un valor muy alto puede causar problemas si el precio cambia drásticamente.',
        'Guarda los cambios y prueba con una transacción pequeña.'
      ],
      tip: 'El valor predeterminado de validez suele ser suficiente; solo ajústalo en condiciones de red congestionada.'
    },
    'localnet-dev': {
      intro: 'Ejecuta una red local de Algorand para desarrollo y pruebas. Ideal para desarrolladores que deseen probar contratos sin costo.',
      steps: [
        'Instala AlgoKit en tu entorno de desarrollo.',
        'Ejecuta `algokit localnet start` para iniciar la red local.',
        'Cambia la red en la aplicación a "Localnet".',
        'Configura la URL del nodo local en los ajustes de blockchain.',
        'Usa las cuentas de prueba del localnet para experimentar libremente.'
      ],
      tip: 'Localnet reinicia su estado al detenerse; guarda los datos de prueba importantes antes de apagarlo.'
    },
    'about': {
      intro: 'Consulta la versión actual de la aplicación, información del equipo y enlaces a recursos relacionados con Biatec DEX.',
      steps: [
        'Navega a la sección "Acerca de" desde el menú principal o los ajustes.',
        'Revisa la versión actual de la aplicación.',
        'Consulta los enlaces al equipo y los recursos oficiales.',
        'Encuentra el enlace al repositorio de código abierto si deseas contribuir.',
        'Accede a los canales de soporte y comunidad desde esta sección.'
      ],
      tip: 'Mantén la aplicación actualizada para acceder a las últimas funciones y mejoras de seguridad.'
    },
    'documentation': {
      intro: 'Explora la documentación oficial de Biatec DEX para guías detalladas, referencias técnicas y tutoriales. Tu fuente de verdad para todo sobre la plataforma.',
      steps: [
        'Accede a la documentación desde el menú de ayuda o el pie de página.',
        'Usa el buscador de la documentación para encontrar temas específicos.',
        'Navega por las categorías: guías de usuario, referencia técnica y API.',
        'Consulta los tutoriales paso a paso para funciones complejas.',
        'Reporta errores en la documentación mediante el enlace de retroalimentación.'
      ],
      tip: 'Guarda la documentación en favoritos para consultarla rápidamente mientras operas.'
    },
    'security-best-practices': {
      intro: 'Sigue estas recomendaciones de seguridad para proteger tus activos en Biatec DEX. La seguridad es responsabilidad de cada usuario.',
      steps: [
        'Nunca compartas tu frase semilla o clave privada con nadie.',
        'Verifica siempre los detalles de la transacción antes de firmar.',
        'Usa una billetera de hardware para grandes cantidades de activos.',
        'Considera el uso de multifirma para mayor seguridad en cuentas importantes.',
        'Accede siempre a la DApp desde la URL oficial y verifica el certificado SSL.'
      ],
      tip: 'Si ves una transacción inesperada en tu billetera, recházala inmediatamente y revisa tu cuenta.'
    },
    'help-center': {
      intro: 'El centro de ayuda de Biatec DEX es una guía indexada y buscable que cubre todas las funciones de la plataforma. Encuentra respuestas a tus preguntas aquí.',
      steps: [
        'Accede al centro de ayuda desde el menú principal o el ícono de ayuda.',
        'Usa la barra de búsqueda para encontrar temas específicos.',
        'Navega por las categorías: trading, liquidez, configuración y más.',
        'Haz clic en cualquier artículo para ver la guía detallada con pasos e información.',
        'Si no encuentras lo que buscas, contacta al soporte desde los enlaces del centro de ayuda.'
      ],
      tip: 'Usa palabras clave cortas en el buscador para obtener los mejores resultados.'
    }
  }
  ,
  hu: {
    'explore-assets': {
      intro: 'Az eszközök táblázata áttekintést nyújt az összes elérhető kereskedési párról, beleértve a TVL-t, árakat, 24 órás forgalmat és díjakat.',
      steps: [
        'Nyissa meg a főoldalt, és tekintse meg az eszközök táblázatát.',
        'Rendezze az oszlopokat TVL, ár vagy forgalom szerint kattintással.',
        'Keressen egy adott eszközre a keresőmező segítségével.',
        'Kattintson egy sorra a részletes kereskedési nézet megnyitásához.',
        'Figyelje a 24 órás változásokat és a díjszinteket.'
      ],
      tip: 'A TVL szerinti rendezés segít megtalálni a leglikvidebb párokat.'
    },
    'find-asset-by-id': {
      intro: 'Az Algorand ASA-kat egyedi numerikus azonosítóval lehet megkeresni az eszközök listájában.',
      steps: [
        'Nyissa meg az eszközök keresési mezőjét az oldalon.',
        'Írja be az ASA numerikus azonosítóját a mezőbe.',
        'Várja meg, amíg a rendszer megtalálja az eszközt.',
        'Kattintson az eredményre a kereskedési nézet megnyitásához.'
      ],
      tip: 'Az Algorand Explorerben megtalálhatja bármely ASA azonosítóját.'
    },
    'connect-wallet': {
      intro: 'Csatlakozhat Pera, Defly vagy Lute tárcával, illetve ARC-76 e-mail/jelszó hitelesítéssel.',
      steps: [
        'Kattintson a "Tárca csatlakoztatása" gombra az oldal tetején.',
        'Válassza ki a kívánt tárca típusát a listából.',
        'Pera vagy Defly esetén olvassa be a QR-kódot a mobilalkalmazással.',
        'ARC-76 esetén adja meg e-mail-címét és jelszavát.',
        'Erősítse meg a csatlakozást a tárcájában.'
      ],
      tip: 'A Pera Wallet mobilalkalmazást ajánljuk a legjobb Algorand élményhez.'
    },
    'switch-language': {
      intro: 'A felület nyelvét bármikor megváltoztathatja a beállításokban vagy a fejlécben.',
      steps: [
        'Kattintson a fejlécben lévő nyelvi ikonra vagy a Beállítások menüre.',
        'Válassza ki a kívánt nyelvet a legördülő listából.',
        'A felület azonnal megváltozik a kiválasztott nyelvre.',
        'A beállítás automatikusan mentésre kerül a következő látogatáshoz.'
      ],
      tip: 'Jelenleg 10 nyelv érhető el, köztük a magyar is.'
    },
    'switch-theme': {
      intro: 'A felület sötét és világos témája között válthat a hold/nap ikonnal.',
      steps: [
        'Keresse meg a hold vagy nap ikont a fejlécben.',
        'Kattintson rá a téma váltásához.',
        'A változás azonnal érvénybe lép az egész felületen.',
        'A kiválasztott téma mentésre kerül a következő munkamenethez.'
      ],
      tip: 'Sötét témában kevésbé fárasztja a szemet éjszakai kereskedés közben.'
    },
    'trade-screen': {
      intro: 'A fő kereskedési nézet tartalmazza a megbízási formot, ábrát, piaci mélységet és legutóbbi kereskedéseket.',
      steps: [
        'Válassza ki a kereskedési párt a párválasztó segítségével.',
        'Tekintse meg az árfolyamgrafikon és a piaci mélység diagramot.',
        'Adja meg a vásárolni vagy eladni kívánt összeget a formban.',
        'Ellenőrizze a csúszást és a becsült árat.',
        'Kattintson a "Vásárlás" vagy "Eladás" gombra a megbízás elküldéséhez.',
        'Erősítse meg a tranzakciót a tárcájában.'
      ],
      tip: 'A legutóbbi kereskedések oszlopa valós időben frissül a SignalR segítségével.'
    },
    'buy-order': {
      intro: 'Vásárlási megbízást adhat fel egy adott eszköz megvásárlásához a megadott csúszással.',
      steps: [
        'Nyissa meg a kereskedési képernyőt a kívánt párral.',
        'Adja meg a vásárolni kívánt összeget a beviteli mezőbe.',
        'Ellenőrizze a becsült árat és a csúszási értéket.',
        'Kattintson a "Vásárlás" gombra a megbízás elküldéséhez.',
        'Erősítse meg a tranzakciót a tárcájában.'
      ],
      tip: 'Alacsony likviditású párok esetén növelje a csúszási toleranciát.'
    },
    'sell-order': {
      intro: 'Eladási megbízással konvertálhatja az eszközét a párosított tokenre.',
      steps: [
        'Nyissa meg a kereskedési képernyőt a kívánt párral.',
        'Adja meg az eladni kívánt összeget.',
        'Ellenőrizze a várható kapott összeget és a díjat.',
        'Kattintson az "Eladás" gombra a megbízás elküldéséhez.',
        'Erősítse meg a tranzakciót a tárcájában.'
      ],
      tip: 'Ellenőrizze az egyenlegét, mielőtt eladási megbízást ad fel.'
    },
    'market-depth': {
      intro: 'A piaci mélység diagram vizuálisan mutatja az egyes árbinokban elérhető likviditást.',
      steps: [
        'Nyissa meg a kereskedési képernyőt.',
        'Tekintse meg a mélység diagramot a chart alatt.',
        'Az egérrel vigyen az egyes oszlopok fölé a részletes adatokhoz.',
        'Az oszlopok magassága arányos az adott áron elérhető likviditással.',
        'A jelenlegi piaci ár a diagramon középen jelenik meg.'
      ],
      tip: 'Nagy likviditásbeli rések figyelmeztethetnek az ármozgás várható iránya.'
    },
    'recent-trades': {
      intro: 'A legutóbbi kereskedések élő lista formájában mutatja a valós idejű cseréket.',
      steps: [
        'Tekintse meg a kereskedési képernyő jobb oldalán a kereskedések listáját.',
        'Minden sor mutatja az árat, összeget, irányt és időpontot.',
        'A zöld sorok vásárlásokat, a piros sorok eladásokat jelölnek.',
        'Az új kereskedések automatikusan megjelennek a lista tetején.',
        'Kattintson egy sorra a tranzakció részleteinek megtekintéséhez.'
      ],
      tip: 'A lista valós időben frissül SignalR WebSocket kapcsolaton keresztül.'
    },
    'pool-swap': {
      intro: 'Egy adott likviditási poolon keresztül közvetlenül cserélhet tokeneket.',
      steps: [
        'Navigáljon a kívánt pool oldalára.',
        'Válassza ki a csere irányát (A→B vagy B→A).',
        'Adja meg a cserélni kívánt összeget.',
        'Ellenőrizze az árat, díjat és csúszást.',
        'Kattintson a "Csere" gombra és erősítse meg a tárcájában.'
      ],
      tip: 'A pool-on keresztüli csere pontosabb árat adhat speciális párokban.'
    },
    'select-pair': {
      intro: 'A kereskedési pár kiválasztásával meghatározza, mely két tokent kívánja kereskedni.',
      steps: [
        'Kattintson a párválasztó gombra a kereskedési képernyő tetején.',
        'Keressen rá az eszköz nevére vagy azonosítójára.',
        'Válassza ki a kívánt párt a listából.',
        'A kereskedési képernyő automatikusan frissül az új párral.',
        'A kiválasztott pár megjelenik az URL-ben is megosztáshoz.'
      ],
      tip: 'A kedvenc párjait könyvjelzőzze a böngészőben a gyors hozzáféréshez.'
    },
    'price-chart': {
      intro: 'Az OHLCV gyertyatartó grafikon időkeretes nézetet nyújt az árfolyammozgásról.',
      steps: [
        'Nyissa meg a kereskedési képernyőt a kívánt párral.',
        'Tekintse meg a grafikon területét az oldal közepén.',
        'Válasszon időkeretet (1p, 5p, 1ó, 1n stb.) a grafikon felett.',
        'Az egérrel vigyen egy gyertya fölé a OHLCV adatok megtekintéséhez.',
        'Nagyíthat és kicsinyíthet a grafikon görgetésével.'
      ],
      tip: 'A hosszabb időkeretek megmutatják a nagyobb trendeket és szinteket.'
    },
    'asset-info': {
      intro: 'Az eszközinformációs panel megjeleníti az ASA metaadatait, köztük az azonosítót, tizedesjegyeket és létrehozót.',
      steps: [
        'Nyissa meg a kívánt eszköz kereskedési nézetét.',
        'Keresse meg az "Eszközinfó" vagy "Token info" szekciót.',
        'Tekintse meg az ASA azonosítót, tizedesjegyek számát és létrehozó címét.',
        'Kattintson a linkre az Algorand Explorer megnyitásához.',
        'Ellenőrizze az eszköz hitelességét a metaadatok alapján.'
      ],
      tip: 'Mindig ellenőrizze az ASA azonosítót, mielőtt kereskedni kezd egy új tokennel.'
    },
    'share-pair': {
      intro: 'Az aktuális kereskedési pár URL-jét megoszthatja másokkal egyetlen kattintással.',
      steps: [
        'Nyissa meg a kívánt kereskedési párt.',
        'Kattintson a megosztás ikonra az oldal tetején.',
        'Az URL automatikusan a vágólapra másolódik.',
        'Ossza meg a linket bárkivel, aki közvetlenül ezt a párt szeretné megnyitni.'
      ],
      tip: 'A megosztott URL tartalmazza a pár és pool paramétereket is.'
    },
    'liquidity-dashboard': {
      intro: 'A likviditásszolgáltató irányítópult áttekintést nyújt az összes aktív LP pozíciójáról.',
      steps: [
        'Csatlakozzon a tárcájával az alkalmazáshoz.',
        'Kattintson a "Likviditás" menüpontra a navigációban.',
        'Tekintse meg az összes aktív pozícióját a táblázatban.',
        'Ellenőrizze az egyes pozíciók értékét, díjbevételét és tartományát.',
        'Válasszon egy pozíciót a részletek megtekintéséhez vagy módosításához.'
      ],
      tip: 'A díjbevétel rendszeres visszaigénylése maximalizálja a hozamot.'
    },
    'create-pool': {
      intro: 'Új CLAMM likviditási poolt hozhat létre két eszköz és egy díjtier kiválasztásával.',
      steps: [
        'Kattintson az "Új pool létrehozása" gombra a likviditás irányítópulton.',
        'Válassza ki az első eszközt az ASA azonosítója vagy neve alapján.',
        'Válassza ki a második eszközt hasonlóan.',
        'Válasszon díjtieret (0,01%, 0,05%, 0,3% vagy 1%).',
        'Adja meg a kezdeti árat és a bin lépés méretét.',
        'Erősítse meg a pool paramétereivel együtt.'
      ],
      tip: 'A stabilis párokhoz alacsony, a volatilis párokhoz magasabb díjtieret válasszon.'
    },
    'add-liquidity-focused': {
      intro: 'A Fókuszált likviditásforma az aktuális ár köré koncentrálja a tőkét a maximális tőkehatékonyság érdekében.',
      steps: [
        'Nyissa meg a "Likviditás hozzáadása" dialógusablakot.',
        'Válassza a "Fókuszált" formát.',
        'Adja meg az elhelyezni kívánt összeget.',
        'Ellenőrizze az automatikusan beállított szűk ártartományt.',
        'Kattintson a "Megerősítés" gombra és erősítse meg a tárcájában.'
      ],
      tip: 'A fókuszált forma magasabb díjbevételt hozhat, de aktívabb kezelést igényel.'
    },
    'add-liquidity-spread': {
      intro: 'A Széles likviditásforma az aktuális ár körül szélesebb tartományban osztja el a tőkét.',
      steps: [
        'Nyissa meg a "Likviditás hozzáadása" dialógusablakot.',
        'Válassza a "Széles" formát.',
        'Adja meg az elhelyezni kívánt összeget.',
        'Tekintse meg a szélesebb ártartomány előnézetét.',
        'Kattintson a "Megerősítés" gombra és erősítse meg a tárcájában.'
      ],
      tip: 'A széles forma kevesebb kezelést igényel, de alacsonyabb tőkehatékonyságot biztosít.'
    },
    'add-liquidity-equal': {
      intro: 'Az Egyenletes forma a teljes ártartományra egyenletesen osztja el a likviditást.',
      steps: [
        'Nyissa meg a "Likviditás hozzáadása" dialógusablakot.',
        'Válassza az "Egyenletes" formát.',
        'Adja meg az elhelyezni kívánt összeget.',
        'Ellenőrizze a teljes tartományra vonatkozó elosztást.',
        'Kattintson a "Megerősítés" gombra és erősítse meg a tárcájában.'
      ],
      tip: 'Az egyenletes forma hasonlít a hagyományos AMM modellhez és stabil kezelést biztosít.'
    },
    'add-liquidity-single': {
      intro: 'Az Egyoldalú forma lehetővé teszi, hogy csak egyetlen eszközzel adjon likviditást.',
      steps: [
        'Nyissa meg a "Likviditás hozzáadása" dialógusablakot.',
        'Válassza az "Egyoldalú" formát.',
        'Válassza ki, melyik eszközzel szeretne likviditást biztosítani.',
        'Adja meg az összeget.',
        'Kattintson a "Megerősítés" gombra és erősítse meg a tárcájában.'
      ],
      tip: 'Az egyoldalú forma akkor hasznos, ha csak az egyik eszközből van többlete.'
    },
    'add-liquidity-wall': {
      intro: 'A Fal forma egy adott áron koncentrálja az összes likviditást egyetlen árszintre.',
      steps: [
        'Nyissa meg a "Likviditás hozzáadása" dialógusablakot.',
        'Válassza a "Fal" formát.',
        'Adja meg a célzott árat, amelyen a likviditást el kívánja helyezni.',
        'Adja meg az összeget.',
        'Kattintson a "Megerősítés" gombra és erősítse meg a tárcájában.'
      ],
      tip: 'A fal forma limit megbízásszerű viselkedést tesz lehetővé a CLAMM-ban.'
    },
    'remove-liquidity': {
      intro: 'A likviditás kivonásával mindkét eszközt visszakapja a poolból az arányuknak megfelelően.',
      steps: [
        'Navigáljon a "Likviditás kezelése" oldalra.',
        'Válassza ki a kivonni kívánt pozíciót.',
        'Adja meg a kivonni kívánt százalékot vagy összeget.',
        'Tekintse meg a visszakapandó eszközök előnézetét.',
        'Kattintson a "Kivonás" gombra és erősítse meg a tárcájában.'
      ],
      tip: 'A részleges kivonással is érdemes lehet visszaigényelni a felhalmozott díjakat.'
    },
    'manage-liquidity': {
      intro: 'A likviditáskezelő oldalon megtekintheti és módosíthatja meglévő LP pozícióját.',
      steps: [
        'Nyissa meg az LP irányítópultot és válasszon egy pozíciót.',
        'Tekintse meg a pozíció részleteit: tartomány, TVL, díjbevétel.',
        'Válasszon a lehetséges műveletek közül: hozzáadás, kivonás, igénylés.',
        'Kövesse a kiválasztott művelet lépéseit.',
        'Erősítse meg a tranzakciót a tárcájában.'
      ],
      tip: 'Az "Igénylés" funkcióval a pozíció lezárása nélkül veheti fel a díjakat.'
    },
    'review-before-sign': {
      intro: 'A tárca aláírása előtt mindig tekintse át a tranzakció részleteit a hibák elkerülése érdekében.',
      steps: [
        'Az alkalmazás egy összefoglaló dialógust jelenít meg a küldés előtt.',
        'Ellenőrizze az összegeket, eszközöket és a célcímet.',
        'Győződjön meg, hogy a díjak és csúszás elfogadható.',
        'Nyissa meg a tárcáját a megerősítési kéréshez.',
        'Ellenőrizze a tárcában is a tranzakció adatait.',
        'Csak akkor írja alá, ha minden adat helyes.'
      ],
      tip: 'Soha ne írjon alá tranzakciót, ha az összegek nem egyeznek az elvárásaival.'
    },
    'liquidity-shapes': {
      intro: 'A Biatec DEX öt különböző likviditási formát kínál különböző kereskedési stratégiákhoz.',
      steps: [
        'Ismerje meg a Fókuszált formát: szűk tartomány, magas tőkehatékonyság.',
        'Ismerje meg a Széles formát: közepes tartomány, kiegyensúlyozott megközelítés.',
        'Ismerje meg az Egyenletes formát: teljes tartomány, stabil, passzív stratégia.',
        'Ismerje meg az Egyoldalú formát: csak egy eszközzel való részvétel.',
        'Ismerje meg a Fal formát: egyetlen árszintre koncentrált likviditás.',
        'Válassza a stratégiájának és kockázattűrésének megfelelő formát.'
      ],
      tip: 'Kezdőknek az Egyenletes vagy Széles forma ajánlott az egyszerűbb kezelhetőség miatt.'
    },
    'lp-fee-tiers': {
      intro: 'A díjtierek meghatározzák, hogy a kereskedők mekkora díjat fizetnek és az LP-k mekkora hozamot kapnak.',
      steps: [
        'Ismerje meg a 0,01%-os tieret: stabil párokhoz, nagy forgalomhoz.',
        'Ismerje meg a 0,05%-os tieret: kis volatilitású párokhoz.',
        'Ismerje meg a 0,3%-os tieret: legtöbb pár esetén ajánlott.',
        'Ismerje meg az 1%-os tieret: erősen volatilis vagy exotikus párokhoz.',
        'Válasszon pool létrehozásakor a pár jellemzői alapján.'
      ],
      tip: 'A magasabb díjtier nem mindig jobb — a kereskedők az alacsonyabb díjú poolokat részesítik előnyben.'
    },
    'price-range': {
      intro: 'Az egyéni ártartomány beállításával pontosan meghatározhatja, hol legyen aktív a likviditása.',
      steps: [
        'Nyissa meg a likviditás hozzáadása dialógust.',
        'Válassza az egyéni tartomány opciót.',
        'Adja meg a minimum és maximum árat.',
        'Tekintse meg az előnézeti diagramon a tartomány elhelyezkedését.',
        'Győződjön meg, hogy az aktuális ár a tartományon belül van.',
        'Folytassa a tranzakció megerősítésével.'
      ],
      tip: 'Ha az ár kilép a tartományból, a likviditás inaktívvá válik és nem termel díjat.'
    },
    'precision-bins': {
      intro: 'A bin lépés mérete határozza meg az árbinok granularitását és a pool pontosságát.',
      steps: [
        'Pool létrehozásakor állítsa be a bin lépés méretét.',
        'Kisebb lépés = pontosabb árak, de több tranzakció a tartományváltáshoz.',
        'Nagyobb lépés = szélesebb binok, egyszerűbb kezelés.',
        'Válasszon a pár volatilitása alapján megfelelő lépésméretet.',
        'Erősítse meg a pool paramétereivel együtt.'
      ],
      tip: 'Stabilis párokhoz kisebb, volatilis párokhoz nagyobb bin lépést ajánlunk.'
    },
    'pool-costs-mbr': {
      intro: 'Az Algorand MBR (minimális egyenlegkövetelmény) a pool létrehozásához és kezeléséhez szükséges ALGO összeg.',
      steps: [
        'Tekintse meg a pool létrehozása előtt az MBR összegét.',
        'Győződjön meg róla, hogy a tárcájában elegendő ALGO van.',
        'Az MBR a pool lezárásakor részben visszaigényelhető.',
        'Különböző műveletek eltérő MBR-t igényelnek.',
        'Az alkalmazás mindig megmutatja a várható MBR-t a megerősítés előtt.'
      ],
      tip: 'Tartson mindig tartalék ALGO-t a tárcájában az MBR és tranzakciós díjak fedezésére.'
    },
    'trader-dashboard': {
      intro: 'A kereskedői irányítópult személyes kereskedési statisztikáit és előzményeit mutatja.',
      steps: [
        'Csatlakozzon a tárcájával.',
        'Navigáljon a "Kereskedői irányítópult" oldalra.',
        'Tekintse meg a kereskedési előzményeket és statisztikákat.',
        'Szűrje az előzményeket időszak vagy eszköz szerint.',
        'Exportálhatja az adatokat további elemzéshez.'
      ],
      tip: 'A kereskedési előzmények segítenek a stratégia finomhangolásában.'
    },
    'asset-opt-in': {
      intro: 'Az Algorand hálózaton egy ASA fogadásához előbb be kell jelentkezni (opt-in) az eszközbe.',
      steps: [
        'Navigáljon az "Eszköz bejelentkezés" oldalra.',
        'Keresse meg az eszközt neve vagy azonosítója alapján.',
        'Kattintson a "Bejelentkezés" gombra az eszköz mellett.',
        'Erősítse meg a tranzakciót a tárcájában (0,1 ALGO MBR szükséges).',
        'A sikeres bejelentkezés után az eszköz megjelenik az egyenlegénél.'
      ],
      tip: 'Az opt-in 0,1 ALGO minimális egyenleget zárol, amely az opt-out után visszajár.'
    },
    'copy-address': {
      intro: 'Algorand tárca-címét egyszerűen másolhatja a vágólapra az alkalmazásból.',
      steps: [
        'Csatlakozzon a tárcájával az alkalmazáshoz.',
        'Kattintson a tárca ikonra vagy a cím megjelenítő területre a fejlécben.',
        'Kattintson a másolás ikonra a cím mellett.',
        'A cím bekerül a vágólapra és beilleszthető bárhova.'
      ],
      tip: 'Mindig ellenőrizze a másolt cím helyességét beillesztés után.'
    },
    'disconnect-wallet': {
      intro: 'A tárca leválasztásával kijelentkezhet az alkalmazásból és biztonságossá teheti a munkamenetét.',
      steps: [
        'Kattintson a tárca ikonra vagy a saját nevére a fejlécben.',
        'Válassza a "Leválasztás" vagy "Kijelentkezés" opciót.',
        'Erősítse meg a leválasztást.',
        'Az alkalmazás visszaáll a csatlakoztatás nélküli állapotba.'
      ],
      tip: 'Nyilvános eszközök használata után mindig válassza le a tárcáját.'
    },
    'switch-network': {
      intro: 'Az alkalmazásban válthat Főhálózat, Teszthálózat és Helyi hálózat között.',
      steps: [
        'Kattintson a hálózatváltó gombra a fejlécben vagy a beállításokban.',
        'Válassza a kívánt hálózatot: Főhálózat, Teszthálózat vagy Helyi hálózat.',
        'Az alkalmazás újratölti az adatokat az új hálózathoz.',
        'Csatlakoztassa a tárcáját a megfelelő hálózaton.'
      ],
      tip: 'Teszthálózaton próbálja ki a funkciókat valódi pénz kockáztatása nélkül.'
    },
    'settings-blockchain': {
      intro: 'A blokklánc beállításokban konfigurálhatja a csomópont URL-jét, indexer URL-jét és API-kulcsát.',
      steps: [
        'Navigáljon a Beállítások oldalra.',
        'Nyissa meg a "Blokklánc" szekciót.',
        'Adja meg az egyéni csomópont URL-jét, ha szükséges.',
        'Adja meg az indexer URL-jét és az API-kulcsot.',
        'Mentse a beállításokat az alkalmazás újraindításával.'
      ],
      tip: 'Saját Algorand csomópont használatával maximális adatvédelmet és megbízhatóságot érhet el.'
    },
    'settings-swap': {
      intro: 'A csere beállításokban konfigurálhatja az alapértelmezett csúszást és egyéb csere paramétereket.',
      steps: [
        'Navigáljon a Beállítások oldalra.',
        'Nyissa meg a "Csere" szekciót.',
        'Állítsa be az alapértelmezett csúszási toleranciát százalékban.',
        'Konfigurálja a többi csere paramétert igény szerint.',
        'A beállítások automatikusan mentésre kerülnek.'
      ],
      tip: 'A 0,5%-os alapértelmezett csúszás a legtöbb kereskedéshez megfelelő.'
    },
    'reset-settings': {
      intro: 'Az összes beállítást visszaállíthatja az alapértékekre egyetlen művelettel.',
      steps: [
        'Navigáljon a Beállítások oldalra.',
        'Görgessen le az oldal aljára.',
        'Kattintson a "Beállítások visszaállítása" gombra.',
        'Erősítse meg a visszaállítást a felugró ablakban.',
        'Az alkalmazás visszaáll az alapértelmezett konfigurációra.'
      ],
      tip: 'A visszaállítás nem törli a csatlakoztatott tárca adatait, csak az alkalmazás beállításait.'
    },
    'tx-validity': {
      intro: 'A tranzakció érvényességi körök meghatározzák, meddig fogadja el a hálózat a tranzakciót.',
      steps: [
        'Navigáljon a Beállítások oldalra.',
        'Keresse meg a "Tranzakció érvényességi körök" beállítást.',
        'Adja meg a kívánt körök számát (alapértelmezett: 1000).',
        'Mentse a beállítást.',
        'Az új értéket minden következő tranzakció használja.'
      ],
      tip: 'Lassú hálózat esetén növelje az érvényességi körök számát a tranzakció lejáratának elkerülésére.'
    },
    'localnet-dev': {
      intro: 'A helyi Algorand hálózat fejlesztőknek lehetővé teszi a funkciók valódi tőke nélküli tesztelését.',
      steps: [
        'Telepítse az Algokit eszközt a fejlesztői gépre.',
        'Indítsa el a helyi hálózatot az "algokit localnet start" paranccsal.',
        'Az alkalmazásban váltson "Helyi hálózat" módra.',
        'Konfigurálja a csomópont és indexer URL-eket a helyi végpontokra.',
        'Tesztelje a funkciókat a szimulált hálózaton.'
      ],
      tip: 'A helyi hálózat nulláról indul minden indításkor, így tiszta tesztkörnyezetet biztosít.'
    },
    'about': {
      intro: 'Az "Rólunk" oldalon megtalálhatja az alkalmazás verzióját, a csapat adatait és a kapcsolódó linkeket.',
      steps: [
        'Navigáljon a "Rólunk" oldalra a navigációs menüből.',
        'Tekintse meg az aktuális alkalmazásverzió számát.',
        'Olvassa el a Biatec csapat és az xGov#80 finanszírozás adatait.',
        'Kövesse a hivatkozásokat a dokumentációhoz, GitHub-hoz és közösségi oldalakhoz.'
      ],
      tip: 'Hibajelentéshez mindig adja meg az alkalmazás verzióját a visszajelzésben.'
    },
    'documentation': {
      intro: 'A hivatalos Biatec DEX dokumentáció részletes útmutatókat és API-referenciákat tartalmaz.',
      steps: [
        'Kattintson a "Dokumentáció" linkre a navigációban vagy az "Rólunk" oldalon.',
        'Böngéssze a dokumentáció szerkezetét a bal oldali menüben.',
        'Keressen rá a kívánt témára a keresőmező segítségével.',
        'Olvassa el a részletes útmutatókat és kódpéldákat.'
      ],
      tip: 'A fejlesztői dokumentáció tartalmazza az okosszerződés interfészeket és az API-specifikációkat.'
    },
    'security-best-practices': {
      intro: 'A biztonsági ajánlások betartásával megvédheti eszközeit és tárca-adatait.',
      steps: [
        'Mindig ellenőrizze a tranzakció adatait az aláírás előtt.',
        'Soha ne ossza meg a mnemonikus kifejezését (seed phrase) senkivel.',
        'Használjon hardver tárcát vagy többaláírásos (multisig) megoldást nagy összegekhez.',
        'Ellenőrizze az alkalmazás URL-jét minden látogatáskor az adathalász oldalak elkerülésére.',
        'Rendszeresen ellenőrizze a tárcája tranzakciós előzményeit.'
      ],
      tip: 'Egyetlen legitim alkalmazás sem kéri el soha a mnemonikus kifejezését.'
    },
    'help-center': {
      intro: 'A súgóközpont kereshető útmutatók gyűjteménye a Biatec DEX összes funkciójához.',
      steps: [
        'Nyissa meg a súgóközpontot a navigációs menüből.',
        'Keressen rá egy funkcióra a keresőmező segítségével.',
        'Böngéssze a kategóriák szerint rendezett útmutatókat.',
        'Kattintson egy útmutatóra a részletes lépések megtekintéséhez.',
        'Kövesse a lépéseket és olvassa el a pro tippet az oldal alján.'
      ],
      tip: 'Ha nem talál választ, lépjen kapcsolatba a Biatec közösséggel a Discord-on.'
    }
  }
  ,
  it: {
    'explore-assets': {
      intro: 'Esplora la tabella degli asset per visualizzare TVL, prezzi, volume nelle ultime 24 ore e commissioni.',
      steps: [
        'Apri la schermata principale e seleziona la sezione Asset.',
        'Ordina la tabella per TVL, prezzo o volume facendo clic sull\'intestazione della colonna.',
        'Usa la barra di ricerca per filtrare gli asset per nome o simbolo.',
        'Fai clic su un asset per aprire la schermata di trading corrispondente.',
        'Controlla le commissioni e il volume per valutare la liquidità disponibile.'
      ],
      tip: 'Ordina per volume nelle ultime 24 ore per trovare gli asset più scambiati del giorno.'
    },
    'find-asset-by-id': {
      intro: 'Cerca qualsiasi asset Algorand Standard (ASA) inserendo il suo ID numerico univoco.',
      steps: [
        'Vai alla sezione di ricerca asset nell\'interfaccia.',
        'Inserisci l\'ID numerico dell\'ASA nell\'apposito campo.',
        'Premi Invio o fai clic sul pulsante di ricerca.',
        'Verifica i dettagli dell\'asset visualizzati (nome, decimali, creatore).',
        'Seleziona l\'asset per avviare il trading o aggiungere liquidità.'
      ],
      tip: 'Puoi trovare l\'ID di un ASA su Allo.info o AlgoExplorer cercando il nome del token.'
    },
    'connect-wallet': {
      intro: 'Collega il tuo portafoglio Algorand per accedere a tutte le funzionalità di Biatec DEX.',
      steps: [
        'Fai clic sul pulsante "Connetti portafoglio" in alto a destra.',
        'Seleziona il tuo provider preferito: Pera, Defly, Lute o Email (ARC-76).',
        'Approva la richiesta di connessione nel tuo portafoglio o inserisci le credenziali email.',
        'Verifica che il tuo indirizzo Algorand sia visualizzato correttamente nell\'intestazione.',
        'Assicurati di essere sulla rete corretta prima di procedere.'
      ],
      tip: 'Usa Pera Wallet per la migliore esperienza mobile con supporto QR code integrato.'
    },
    'switch-language': {
      intro: 'Cambia la lingua dell\'interfaccia utente direttamente dalle impostazioni o dall\'intestazione dell\'applicazione.',
      steps: [
        'Fai clic sull\'icona della lingua o sul menu impostazioni nell\'intestazione.',
        'Seleziona la lingua desiderata dall\'elenco a discesa.',
        'L\'interfaccia si aggiornerà immediatamente nella lingua selezionata.',
        'Verifica che tutti i testi siano visualizzati correttamente nella nuova lingua.'
      ],
      tip: 'La preferenza della lingua viene salvata localmente e mantenuta tra le sessioni.'
    },
    'switch-theme': {
      intro: 'Passa dal tema chiaro a quello scuro utilizzando l\'icona luna/sole nell\'intestazione.',
      steps: [
        'Individua l\'icona luna (tema scuro) o sole (tema chiaro) nell\'intestazione.',
        'Fai clic sull\'icona per alternare tra tema chiaro e scuro.',
        'Il tema si applica immediatamente a tutta l\'interfaccia.',
        'La preferenza viene salvata automaticamente nel browser.'
      ],
      tip: 'Il tema scuro è consigliato per sessioni di trading prolungate per ridurre l\'affaticamento visivo.'
    },
    'trade-screen': {
      intro: 'La schermata di trading principale offre un modulo d\'ordine, un grafico OHLCV, la profondità di mercato e un feed di scambi recenti in un\'unica vista integrata.',
      steps: [
        'Seleziona la coppia di asset che desideri scambiare dal selettore in alto.',
        'Visualizza il grafico a candele per analizzare l\'andamento del prezzo.',
        'Esamina la profondità di mercato per comprendere la liquidità disponibile.',
        'Inserisci l\'importo desiderato nel modulo d\'ordine sul lato.',
        'Controlla lo slippage stimato prima di confermare l\'operazione.',
        'Firma la transazione nel tuo portafoglio per completare lo scambio.'
      ],
      tip: 'Monitora il grafico della profondità di mercato per identificare livelli di supporto e resistenza.'
    },
    'buy-order': {
      intro: 'Piazza un ordine di acquisto (swap) specificando l\'importo e lo slippage massimo accettabile.',
      steps: [
        'Nella schermata di trading, seleziona la scheda "Acquista" nel modulo d\'ordine.',
        'Inserisci l\'importo dell\'asset che desideri acquistare.',
        'Imposta la tolleranza di slippage massima accettabile.',
        'Controlla il prezzo stimato e le commissioni mostrate.',
        'Fai clic su "Acquista" e firma la transazione nel portafoglio.'
      ],
      tip: 'Imposta uno slippage più basso per proteggere il prezzo, ma considera che un valore troppo basso potrebbe far fallire la transazione.'
    },
    'sell-order': {
      intro: 'Piazza un ordine di vendita specificando l\'importo dell\'asset da vendere e lo slippage massimo.',
      steps: [
        'Nella schermata di trading, seleziona la scheda "Vendi" nel modulo d\'ordine.',
        'Inserisci l\'importo dell\'asset che desideri vendere.',
        'Verifica il tuo saldo disponibile visualizzato accanto al campo.',
        'Imposta la tolleranza di slippage desiderata.',
        'Fai clic su "Vendi" e approva la transazione nel tuo portafoglio.'
      ],
      tip: 'Usa la funzione "Max" per vendere l\'intero saldo disponibile di un asset in un\'unica operazione.'
    },
    'market-depth': {
      intro: 'Il grafico della profondità di mercato visualizza la liquidità disponibile a diversi livelli di prezzo.',
      steps: [
        'Individua il grafico della profondità di mercato nella schermata di trading.',
        'Osserva la curva verde (ordini di acquisto) e rossa (ordini di vendita).',
        'Passa il mouse sul grafico per vedere la quantità disponibile a ciascun prezzo.',
        'Usa la profondità per stimare l\'impatto del prezzo del tuo ordine.',
        'Identifica i livelli con alta liquidità come potenziali supporti o resistenze.'
      ],
      tip: 'Una curva di profondità ripida indica poca liquidità e maggiore slippage per ordini di grandi dimensioni.'
    },
    'recent-trades': {
      intro: 'Il feed degli scambi recenti mostra in tempo reale le ultime transazioni eseguite sulla coppia selezionata.',
      steps: [
        'Visualizza il pannello degli scambi recenti nella schermata di trading.',
        'Osserva il colore: verde indica acquisti, rosso indica vendite.',
        'Controlla la colonna del prezzo per vedere a quanto vengono eseguiti gli scambi.',
        'Monitora la dimensione degli scambi per valutare l\'attività del mercato.',
        'Usa questo feed per confermare che il mercato sia attivo prima di operare.'
      ],
      tip: 'Una serie di grandi scambi consecutivi nella stessa direzione può indicare un movimento di prezzo imminente.'
    },
    'pool-swap': {
      intro: 'Esegui uno swap direttamente attraverso un pool di liquidità specifico.',
      steps: [
        'Vai alla schermata del pool che desideri utilizzare.',
        'Seleziona la funzione di swap all\'interno del pool.',
        'Inserisci l\'importo dell\'asset di input.',
        'Verifica il tasso di cambio e le commissioni del pool specifico.',
        'Approva e firma la transazione nel tuo portafoglio.'
      ],
      tip: 'I pool con commissioni più basse sono ideali per scambi frequenti di piccole dimensioni.'
    },
    'select-pair': {
      intro: 'Scegli la coppia di asset che desideri scambiare utilizzando il selettore di coppie.',
      steps: [
        'Fai clic sul selettore della coppia di asset nella schermata di trading.',
        'Digita il nome o il simbolo dell\'asset nel campo di ricerca.',
        'Seleziona il primo asset dalla lista dei risultati.',
        'Ripeti la ricerca per selezionare il secondo asset della coppia.',
        'Conferma la selezione per caricare la schermata di trading della coppia.'
      ],
      tip: 'Le coppie più popolari con ALGO o USDC offrono in genere la maggiore liquidità.'
    },
    'price-chart': {
      intro: 'Il grafico OHLCV a candele mostra l\'andamento storico del prezzo con opzioni di selezione del timeframe.',
      steps: [
        'Apri la schermata di trading per la coppia desiderata.',
        'Individua il grafico a candele nella sezione centrale.',
        'Seleziona il timeframe desiderato (1m, 5m, 1h, 1d, ecc.).',
        'Passa il mouse sulle candele per vedere i valori OHLCV dettagliati.',
        'Usa lo zoom per esaminare periodi specifici della storia dei prezzi.'
      ],
      tip: 'Il timeframe giornaliero è ideale per identificare tendenze di lungo periodo.'
    },
    'asset-info': {
      intro: 'Visualizza i metadati completi di un asset Algorand, inclusi ID, decimali, indirizzo del creatore e altre informazioni on-chain.',
      steps: [
        'Seleziona un asset dalla tabella o dalla schermata di trading.',
        'Fai clic sull\'icona informazioni o sulla sezione dettagli asset.',
        'Leggi l\'ID numerico dell\'ASA per riferimento futuro.',
        'Verifica il numero di decimali per calcoli di precisione.',
        'Controlla l\'indirizzo del creatore per validare l\'autenticità dell\'asset.'
      ],
      tip: 'Verifica sempre l\'ID dell\'asset su un explorer Algorand per evitare token contraffatti con nomi simili.'
    },
    'share-pair': {
      intro: 'Copia o condividi l\'URL della coppia di trading corrente con altri utenti.',
      steps: [
        'Naviga alla schermata di trading della coppia che desideri condividere.',
        'Fai clic sul pulsante di condivisione o copia URL.',
        'L\'URL viene copiato automaticamente negli appunti.',
        'Incolla il link in un messaggio, email o social media.',
        'Chi riceve il link vedrà esattamente la stessa coppia di trading.'
      ],
      tip: 'Usa questa funzione per condividere opportunità di trading specifiche con la tua community.'
    },
    'liquidity-dashboard': {
      intro: 'Il dashboard dei fornitori di liquidità mostra tutte le tue posizioni attive e le statistiche aggregate del tuo portafoglio LP.',
      steps: [
        'Connetti il tuo portafoglio e naviga al dashboard LP.',
        'Visualizza l\'elenco di tutte le tue posizioni di liquidità attive.',
        'Controlla le commissioni accumulate per ciascuna posizione.',
        'Esamina il valore totale bloccato (TVL) nelle tue posizioni.',
        'Usa i pulsanti di azione per gestire, aggiungere o rimuovere liquidità.'
      ],
      tip: 'Controlla regolarmente il tuo dashboard per raccogliere le commissioni accumulate.'
    },
    'create-pool': {
      intro: 'Lancia un nuovo pool CLAMM selezionando due asset e un livello di commissione.',
      steps: [
        'Nel dashboard LP, fai clic su "Crea pool".',
        'Seleziona il primo asset cercandolo per nome o ID.',
        'Seleziona il secondo asset della coppia.',
        'Scegli il livello di commissione appropriato (0.01%, 0.05%, 0.3% o 1%).',
        'Rivedi i costi MBR richiesti per la creazione del pool.',
        'Firma la transazione di creazione nel tuo portafoglio.'
      ],
      tip: 'Scegli un livello di commissione in linea con la volatilità attesa del pair.'
    },
    'add-liquidity-focused': {
      intro: 'Aggiungi liquidità in forma Concentrata, concentrando i fondi attorno al prezzo corrente per massimizzare l\'efficienza del capitale.',
      steps: [
        'Vai al tuo pool nel dashboard LP e seleziona "Aggiungi liquidità".',
        'Scegli la forma "Concentrata" dall\'elenco delle forme disponibili.',
        'Il sistema precompila automaticamente un intervallo ristretto attorno al prezzo corrente.',
        'Inserisci l\'importo degli asset che desideri fornire.',
        'Rivedi l\'efficienza del capitale stimata e le commissioni previste.',
        'Firma la transazione nel portafoglio per depositare la liquidità.'
      ],
      tip: 'La forma Concentrata offre la massima efficienza del capitale ma richiede monitoraggio più frequente.'
    },
    'add-liquidity-spread': {
      intro: 'Aggiungi liquidità in forma Distribuita su un intervallo di prezzo più ampio.',
      steps: [
        'Nel pannello di aggiunta liquidità, seleziona la forma "Distribuita".',
        'L\'interfaccia mostra un intervallo di prezzo più ampio preconfigurato.',
        'Regola i limiti dell\'intervallo se necessario tramite i campi di input.',
        'Inserisci gli importi degli asset che desideri depositare.',
        'Controlla la distribuzione della liquidità visualizzata nel grafico.',
        'Firma la transazione per completare il deposito.'
      ],
      tip: 'La forma Distribuita è ideale per chi preferisce meno manutenzione.'
    },
    'add-liquidity-equal': {
      intro: 'Aggiungi liquidità in forma Uniforme su tutto l\'intervallo di prezzo disponibile.',
      steps: [
        'Seleziona la forma "Uniforme" nel pannello di aggiunta liquidità.',
        'Il sistema imposta automaticamente l\'intervallo sull\'intero range disponibile.',
        'Inserisci l\'importo degli asset da depositare.',
        'Verifica che il rapporto tra i due asset sia equilibrato.',
        'Firma la transazione per aggiungere la liquidità uniforme.'
      ],
      tip: 'La forma Uniforme è perfetta per i principianti: funziona come un AMM tradizionale.'
    },
    'add-liquidity-single': {
      intro: 'Aggiungi liquidità usando un solo asset. Il sistema gestisce internamente la conversione necessaria.',
      steps: [
        'Scegli la forma "Mono-asset" nel pannello di aggiunta liquidità.',
        'Seleziona quale dei due asset del pool desideri depositare.',
        'Inserisci l\'importo dell\'asset scelto.',
        'Il sistema calcola automaticamente la distribuzione nella posizione LP.',
        'Rivedi l\'impatto sulla posizione e le commissioni stimate.',
        'Firma la transazione per completare il deposito mono-asset.'
      ],
      tip: 'L\'aggiunta mono-asset è comoda quando hai disponibilità di un solo token.'
    },
    'add-liquidity-wall': {
      intro: 'Aggiungi liquidità in forma Muro, concentrando tutti i fondi a un livello di prezzo specifico.',
      steps: [
        'Seleziona la forma "Muro" nel pannello di aggiunta liquidità.',
        'Imposta il prezzo target al quale concentrare tutta la liquidità.',
        'Inserisci l\'importo degli asset da depositare.',
        'Verifica che il livello di prezzo scelto sia realistico e raggiungibile.',
        'Firma la transazione per creare la posizione a muro.'
      ],
      tip: 'La forma Muro funziona come un ordine limite: la tua liquidità viene utilizzata solo quando il prezzo raggiunge il livello specificato.'
    },
    'remove-liquidity': {
      intro: 'Ritira la tua posizione LP per ricevere indietro entrambi gli asset, incluse le commissioni accumulate.',
      steps: [
        'Nel dashboard LP, seleziona la posizione che desideri ritirare.',
        'Fai clic su "Rimuovi liquidità".',
        'Specifica la percentuale da ritirare (parziale o 100% per il ritiro totale).',
        'Rivedi gli importi stimati degli asset che riceverai.',
        'Conferma l\'operazione e firma la transazione nel portafoglio.',
        'Verifica che gli asset siano stati accreditati nel tuo portafoglio.'
      ],
      tip: 'Ritira la liquidità prima di movimenti di prezzo significativi per evitare perdite impermanenti.'
    },
    'manage-liquidity': {
      intro: 'Visualizza e gestisci le tue posizioni LP esistenti, monitora le performance e apporta modifiche.',
      steps: [
        'Accedi al dashboard LP e individua la posizione da gestire.',
        'Fai clic sulla posizione per visualizzarne i dettagli completi.',
        'Controlla le commissioni accumulate, il valore attuale e l\'intervallo di prezzo.',
        'Usa i pulsanti per aggiungere liquidità, rimuoverla o raccogliere le commissioni.',
        'Monitora se il prezzo corrente è all\'interno del tuo intervallo attivo.'
      ],
      tip: 'Imposta avvisi di prezzo per sapere quando il prezzo si avvicina ai limiti della tua posizione.'
    },
    'review-before-sign': {
      intro: 'Prima di firmare qualsiasi transazione, rivedi attentamente tutti i dettagli mostrati nell\'interfaccia e nel tuo portafoglio.',
      steps: [
        'Leggi attentamente il riepilogo della transazione mostrato dall\'app.',
        'Verifica l\'importo, l\'asset e l\'indirizzo di destinazione.',
        'Controlla le commissioni di rete e i costi totali stimati.',
        'Apri il tuo portafoglio e rivedi i dettagli della transazione proposta.',
        'Firma solo se tutti i dettagli corrispondono a quanto previsto.',
        'In caso di dubbi, annulla e verifica prima di procedere.'
      ],
      tip: 'Non firmare mai transazioni che non hai capito completamente o che mostrano importi diversi da quelli attesi.'
    },
    'liquidity-shapes': {
      intro: 'Biatec DEX offre 5 forme di liquidità per adattarsi a diverse strategie di investimento.',
      steps: [
        'Studia la forma Concentrata: massima efficienza, richiede monitoraggio frequente.',
        'Esplora la forma Distribuita: buon equilibrio tra efficienza e stabilità.',
        'Comprendi la forma Uniforme: la più semplice, copre l\'intero intervallo.',
        'Analizza la forma Mono-asset: deposito con un solo token.',
        'Apprendi la forma Muro: liquidità concentrata a un prezzo specifico come ordine limite passivo.',
        'Scegli la forma più adatta alla tua strategia e al tempo che puoi dedicare alla gestione.'
      ],
      tip: 'I principianti dovrebbero iniziare con la forma Uniforme prima di passare a strategie più avanzate.'
    },
    'lp-fee-tiers': {
      intro: 'I livelli di commissione LP determinano quanto i trader pagano per usare il tuo pool.',
      steps: [
        'Comprendi i quattro livelli disponibili: 0.01%, 0.05%, 0.3%, 1%.',
        'Usa 0.01% per coppie di stablecoin con volatilità minima.',
        'Scegli 0.05% per coppie con bassa volatilità come asset consolidati.',
        'Opta per 0.3% per la maggior parte delle coppie standard con volatilità media.',
        'Usa 1% per asset molto volatili o con bassa liquidità.'
      ],
      tip: 'Il livello 0.3% è il più utilizzato e offre il miglior equilibrio tra attrazione di liquidità e volume di trading.'
    },
    'price-range': {
      intro: 'Imposta un intervallo di prezzo personalizzato per la tua posizione di liquidità concentrata.',
      steps: [
        'Nel pannello di aggiunta liquidità, individua i campi dell\'intervallo di prezzo.',
        'Inserisci il prezzo minimo nel campo "Limite inferiore".',
        'Inserisci il prezzo massimo nel campo "Limite superiore".',
        'Verifica che il prezzo corrente sia all\'interno dell\'intervallo selezionato.',
        'Controlla la larghezza dell\'intervallo e l\'efficienza del capitale stimata.',
        'Regola i valori fino a trovare il bilanciamento ottimale per la tua strategia.'
      ],
      tip: 'Un intervallo più stretto massimizza le commissioni guadagnate ma aumenta il rischio che il prezzo esca dall\'intervallo.'
    },
    'precision-bins': {
      intro: 'Imposta il passo dei bin e la precisione del prezzo per un pool CLAMM.',
      steps: [
        'Durante la creazione del pool, individua l\'impostazione del passo dei bin.',
        'Scegli un valore di passo bin più piccolo per maggiore precisione del prezzo.',
        'Scegli un valore più grande per una gestione più semplice con meno bin.',
        'Considera che bin più piccoli aumentano i costi computazionali delle transazioni.',
        'Rivedi l\'anteprima della distribuzione dei bin prima di confermare.'
      ],
      tip: 'Per le coppie stablecoin usa bin molto piccoli; per asset volatili usa bin più ampi per ridurre i costi di gestione.'
    },
    'pool-costs-mbr': {
      intro: 'La creazione e la gestione di pool su Algorand richiede il pagamento del requisito minimo di saldo (MBR).',
      steps: [
        'Prima di creare un pool, leggi il riepilogo dei costi MBR mostrato.',
        'Assicurati di avere ALGO sufficienti per coprire l\'MBR richiesto.',
        'Comprendi che l\'MBR varia in base alla complessità del contratto.',
        'Sappi che l\'MBR viene restituito quando il pool viene chiuso.',
        'Includi i costi MBR nella tua pianificazione finanziaria per le operazioni LP.'
      ],
      tip: 'Tieni sempre un buffer di ALGO nel portafoglio per coprire gli MBR e le commissioni di transazione.'
    },
    'trader-dashboard': {
      intro: 'Il dashboard trader mostra le tue statistiche personali di trading, la cronologia delle transazioni e le performance aggregate nel tempo.',
      steps: [
        'Connetti il portafoglio e naviga al dashboard trader.',
        'Visualizza il volume totale scambiato e le commissioni pagate.',
        'Scorri la cronologia delle transazioni recenti.',
        'Filtra la cronologia per asset, data o tipo di operazione.',
        'Analizza le tue performance per migliorare la strategia di trading.'
      ],
      tip: 'Usa il dashboard trader per tracciare le tue performance nel tempo.'
    },
    'asset-opt-in': {
      intro: 'Su Algorand, devi fare l\'opt-in a un ASA prima di poterlo ricevere.',
      steps: [
        'Vai alla sezione Opt-in asset nell\'app.',
        'Cerca l\'asset per nome o inserisci il suo ID numerico.',
        'Verifica i dettagli dell\'asset prima di procedere.',
        'Fai clic su "Opt-in" e firma la transazione nel portafoglio.',
        'Attendi la conferma on-chain prima di tentare di ricevere l\'asset.',
        'Verifica che l\'asset appaia nel tuo portafoglio con saldo zero.'
      ],
      tip: 'Fai l\'opt-in solo ad asset verificati e legittimi: ogni opt-in blocca circa 0.1 ALGO come riserva.'
    },
    'copy-address': {
      intro: 'Copia il tuo indirizzo Algorand negli appunti con un clic per condividerlo facilmente.',
      steps: [
        'Assicurati che il portafoglio sia connesso all\'app.',
        'Individua il tuo indirizzo abbreviato nell\'intestazione o nel dashboard.',
        'Fai clic sull\'icona copia accanto all\'indirizzo.',
        'Ricevi la conferma visiva che l\'indirizzo è stato copiato.',
        'Incolla l\'indirizzo dove necessario.'
      ],
      tip: 'Verifica sempre le prime e ultime lettere dell\'indirizzo incollato prima di inviare fondi.'
    },
    'disconnect-wallet': {
      intro: 'Disconnetti il tuo portafoglio dall\'app quando hai terminato le operazioni.',
      steps: [
        'Fai clic sul tuo indirizzo o sull\'avatar del portafoglio nell\'intestazione.',
        'Seleziona "Disconnetti" o "Esci" dal menu a discesa.',
        'Conferma la disconnessione se richiesto.',
        'Verifica che l\'interfaccia torni allo stato non connesso.',
        'Chiudi il browser se stai usando un dispositivo condiviso per sicurezza aggiuntiva.'
      ],
      tip: 'Disconnettiti sempre quando usi Biatec DEX su computer pubblici o dispositivi condivisi.'
    },
    'switch-network': {
      intro: 'Passa tra Mainnet, Testnet e Localnet per sviluppo, test o trading reale.',
      steps: [
        'Apri le impostazioni o il selettore di rete nell\'intestazione.',
        'Seleziona la rete desiderata: Mainnet, Testnet o Localnet.',
        'Attendi il ricaricamento dell\'app con i dati della nuova rete.',
        'Verifica che il portafoglio sia configurato per la stessa rete.',
        'Controlla che gli asset e i pool visualizzati corrispondano alla rete selezionata.'
      ],
      tip: 'Usa sempre Testnet per sperimentare nuove strategie prima di operare con fondi reali su Mainnet.'
    },
    'settings-blockchain': {
      intro: 'Configura l\'URL del nodo Algorand, l\'URL dell\'indexer e la chiave API.',
      steps: [
        'Vai alle impostazioni dell\'applicazione.',
        'Individua la sezione impostazioni blockchain.',
        'Inserisci l\'URL del nodo Algorand nel campo apposito.',
        'Inserisci l\'URL dell\'indexer per la ricerca dei dati storici.',
        'Aggiungi la chiave API se il nodo la richiede per l\'autenticazione.',
        'Salva le impostazioni e verifica la connessione.'
      ],
      tip: 'Usa un nodo dedicato o un provider premium per migliori performance e affidabilità.'
    },
    'settings-swap': {
      intro: 'Configura le impostazioni predefinite per lo swap, inclusa la tolleranza di slippage.',
      steps: [
        'Accedi alle impostazioni dell\'app e seleziona la sezione swap.',
        'Imposta la tolleranza di slippage predefinita come percentuale.',
        'Configura eventuali altri parametri di swap disponibili.',
        'Salva le modifiche per applicarle a tutti i futuri swap.',
        'Verifica che le impostazioni siano state salvate correttamente.'
      ],
      tip: 'Una tolleranza di slippage dello 0.5%-1% funziona bene per la maggior parte dei mercati.'
    },
    'reset-settings': {
      intro: 'Ripristina tutte le impostazioni ai valori predefiniti dell\'applicazione.',
      steps: [
        'Vai alle impostazioni dell\'applicazione.',
        'Scorri fino alla sezione ripristino o reset.',
        'Fai clic sul pulsante "Ripristina impostazioni predefinite".',
        'Conferma l\'operazione nella finestra di dialogo.',
        'Attendi il ricaricamento dell\'app con le impostazioni predefinite.',
        'Riconfigura manualmente solo le impostazioni personalizzate necessarie.'
      ],
      tip: 'Prima di ripristinare, annota le tue impostazioni personalizzate per poterle reinserire facilmente.'
    },
    'tx-validity': {
      intro: 'Imposta il numero di round di validità per le transazioni Algorand.',
      steps: [
        'Vai alle impostazioni avanzate dell\'applicazione.',
        'Individua il campo "Round di validità transazione".',
        'Inserisci il numero di round desiderato (valore predefinito tipicamente 1000).',
        'Considera che valori più alti danno più tempo per la conferma.',
        'Salva le impostazioni per applicarle alle transazioni future.'
      ],
      tip: 'In condizioni di rete congestionata, aumenta i round di validità per dare più tempo alla transazione.'
    },
    'localnet-dev': {
      intro: 'Esegui una rete Algorand locale per lo sviluppo e i test senza rischi.',
      steps: [
        'Installa AlgoKit seguendo la documentazione ufficiale.',
        'Esegui il comando per avviare Localnet nel terminale.',
        'Connetti Biatec DEX alla rete Localnet nelle impostazioni.',
        'Usa gli account di test predefiniti con ALGO di test.',
        'Crea asset e pool di test per sperimentare le funzionalità.',
        'Resetta Localnet per ricominciare con uno stato pulito quando necessario.'
      ],
      tip: 'Localnet è lo strumento ideale per gli sviluppatori: permette di testare smart contract senza costi reali.'
    },
    'about': {
      intro: 'La sezione About mostra la versione corrente dell\'applicazione, le informazioni sul team Biatec e i link alle risorse ufficiali.',
      steps: [
        'Apri il menu delle impostazioni o naviga alla pagina About.',
        'Visualizza il numero di versione corrente dell\'applicazione.',
        'Leggi le informazioni sul team di sviluppo Biatec.',
        'Accedi ai link alle risorse ufficiali (sito web, GitHub, documentazione).',
        'Trova i link ai canali di supporto e community.'
      ],
      tip: 'Controlla periodicamente la versione dell\'app e aggiorna per beneficiare delle ultime funzionalità.'
    },
    'documentation': {
      intro: 'Esplora la documentazione ufficiale di Biatec DEX per guide approfondite, riferimenti tecnici e tutorial.',
      steps: [
        'Fai clic sul link alla documentazione nel menu o nella sezione About.',
        'Usa la barra di ricerca per trovare argomenti specifici.',
        'Naviga tra le sezioni: Guida utente, Riferimento tecnico, Tutorial.',
        'Leggi le guide per le funzionalità che intendi utilizzare.',
        'Consulta la sezione FAQ per le domande più comuni.'
      ],
      tip: 'Aggiungi ai preferiti la documentazione ufficiale per un accesso rapido quando hai bisogno di riferimenti tecnici.'
    },
    'security-best-practices': {
      intro: 'Segui le migliori pratiche di sicurezza per proteggere i tuoi fondi su Biatec DEX.',
      steps: [
        'Verifica sempre l\'URL dell\'app prima di connettere il portafoglio.',
        'Rivedi attentamente ogni transazione prima di firmarla.',
        'Non condividere mai le tue frasi seed o chiavi private con nessuno.',
        'Considera l\'uso di un multisig per grandi somme di liquidità.',
        'Mantieni il tuo portafoglio hardware aggiornato all\'ultima versione firmware.',
        'Usa connessioni sicure (HTTPS) e reti affidabili per le operazioni.'
      ],
      tip: 'Un portafoglio hardware come Ledger offre il massimo livello di sicurezza per importi significativi.'
    },
    'help-center': {
      intro: 'Il centro assistenza di Biatec DEX è una guida ricercabile che copre tutte le funzionalità della piattaforma.',
      steps: [
        'Apri il centro assistenza dal menu principale o dall\'intestazione.',
        'Usa la barra di ricerca per trovare guide per parola chiave.',
        'Sfoglia le categorie per esplorare argomenti correlati.',
        'Fai clic su una guida per leggere istruzioni dettagliate passo dopo passo.',
        'Usa i suggerimenti in fondo a ogni guida per consigli avanzati.'
      ],
      tip: 'Se non trovi risposta nel centro assistenza, contatta il team Biatec attraverso i canali community ufficiali.'
    }
  }
  ,
  ru: {
    'explore-assets': {
      intro: 'Таблица активов предоставляет полный обзор всех доступных торговых пар, включая TVL, цены, объём за 24 часа и комиссии.',
      steps: [
        'Откройте главный экран и перейдите в раздел активов.',
        'Сортируйте таблицу по TVL, цене или объёму, нажав на заголовок столбца.',
        'Используйте строку поиска для фильтрации активов по названию или символу.',
        'Нажмите на строку актива, чтобы открыть соответствующий торговый экран.',
        'Проверьте комиссии и объём для оценки доступной ликвидности.'
      ],
      tip: 'Сортировка по объёму за 24 часа помогает найти наиболее активно торгуемые активы дня.'
    },
    'find-asset-by-id': {
      intro: 'Найдите любой стандартный актив Algorand (ASA), введя его уникальный числовой идентификатор.',
      steps: [
        'Перейдите в раздел поиска активов в интерфейсе.',
        'Введите числовой ID ASA в соответствующее поле.',
        'Нажмите Enter или кнопку поиска.',
        'Проверьте отображаемые сведения об активе (название, десятичные знаки, создатель).',
        'Выберите актив для начала торговли или добавления ликвидности.'
      ],
      tip: 'Идентификатор ASA можно найти на Allo.info или AlgoExplorer, выполнив поиск по имени токена.'
    },
    'connect-wallet': {
      intro: 'Подключите ваш кошелёк Algorand для доступа ко всем функциям Biatec DEX.',
      steps: [
        'Нажмите кнопку «Подключить кошелёк» в правом верхнем углу.',
        'Выберите предпочитаемого провайдера: Pera, Defly, Lute или Email (ARC-76).',
        'Подтвердите запрос на подключение в кошельке или введите учётные данные электронной почты.',
        'Убедитесь, что ваш адрес Algorand отображается в шапке сайта.',
        'Проверьте, что вы находитесь в правильной сети перед продолжением.'
      ],
      tip: 'Используйте Pera Wallet для лучшего мобильного опыта со встроенной поддержкой QR-кода.'
    },
    'switch-language': {
      intro: 'Измените язык интерфейса непосредственно в настройках или в шапке приложения.',
      steps: [
        'Нажмите на значок языка или меню настроек в шапке.',
        'Выберите нужный язык из выпадающего списка.',
        'Интерфейс немедленно обновится на выбранном языке.',
        'Убедитесь, что все тексты отображаются корректно на новом языке.'
      ],
      tip: 'Языковые предпочтения сохраняются локально и поддерживаются между сессиями.'
    },
    'switch-theme': {
      intro: 'Переключайтесь между светлой и тёмной темой с помощью значка луны/солнца в шапке.',
      steps: [
        'Найдите значок луны (тёмная тема) или солнца (светлая тема) в шапке.',
        'Нажмите на значок для переключения между светлой и тёмной темой.',
        'Тема мгновенно применяется ко всему интерфейсу.',
        'Предпочтение автоматически сохраняется в браузере.'
      ],
      tip: 'Тёмная тема рекомендуется при длительных торговых сессиях для снижения нагрузки на глаза.'
    },
    'trade-screen': {
      intro: 'Главный торговый экран объединяет форму ордера, OHLCV-график, глубину рынка и поток последних сделок.',
      steps: [
        'Выберите торговую пару с помощью селектора пар вверху.',
        'Изучите свечной график для анализа движения цены.',
        'Просмотрите глубину рынка для понимания доступной ликвидности.',
        'Введите желаемую сумму в форму ордера сбоку.',
        'Проверьте расчётное проскальзывание перед подтверждением операции.',
        'Подпишите транзакцию в кошельке для завершения обмена.'
      ],
      tip: 'Следите за графиком глубины рынка для определения уровней поддержки и сопротивления.'
    },
    'buy-order': {
      intro: 'Разместите ордер на покупку (свап), указав сумму и максимально допустимое проскальзывание.',
      steps: [
        'На торговом экране выберите вкладку «Купить» в форме ордера.',
        'Введите сумму актива, который хотите купить.',
        'Установите максимально допустимое проскальзывание.',
        'Проверьте расчётную цену и отображаемые комиссии.',
        'Нажмите «Купить» и подпишите транзакцию в кошельке.'
      ],
      tip: 'Низкое проскальзывание защищает цену, но слишком низкое значение может привести к сбою транзакции.'
    },
    'sell-order': {
      intro: 'Разместите ордер на продажу, указав сумму актива для продажи и максимальное проскальзывание.',
      steps: [
        'На торговом экране выберите вкладку «Продать» в форме ордера.',
        'Введите сумму актива, который хотите продать.',
        'Проверьте доступный баланс, отображаемый рядом с полем.',
        'Задайте желаемое проскальзывание.',
        'Нажмите «Продать» и подтвердите транзакцию в кошельке.'
      ],
      tip: 'Используйте функцию «Макс» для продажи всего доступного баланса актива за одну операцию.'
    },
    'market-depth': {
      intro: 'График глубины рынка визуализирует доступную ликвидность на различных уровнях цен.',
      steps: [
        'Найдите график глубины рынка на торговом экране.',
        'Обратите внимание на зелёную (ордера на покупку) и красную (ордера на продажу) кривые.',
        'Наведите мышь на график, чтобы увидеть объём на каждой цене.',
        'Используйте глубину для оценки ценового воздействия вашего ордера.',
        'Определите уровни с высокой ликвидностью как потенциальные поддержки или сопротивления.'
      ],
      tip: 'Крутая кривая глубины означает малую ликвидность и большое проскальзывание для крупных ордеров.'
    },
    'recent-trades': {
      intro: 'Поток последних сделок в реальном времени отображает последние выполненные транзакции по выбранной паре.',
      steps: [
        'Просмотрите панель последних сделок на торговом экране.',
        'Обратите внимание на цвет: зелёный означает покупки, красный — продажи.',
        'Проверьте столбец цены для просмотра уровней исполнения сделок.',
        'Следите за размером сделок для оценки рыночной активности.',
        'Используйте этот поток для подтверждения активности рынка перед торговлей.'
      ],
      tip: 'Серия крупных последовательных сделок в одном направлении может сигнализировать о надвигающемся движении цены.'
    },
    'pool-swap': {
      intro: 'Выполните своп напрямую через конкретный пул ликвидности.',
      steps: [
        'Перейдите на экран пула, который хотите использовать.',
        'Выберите функцию свопа в пуле.',
        'Введите сумму входящего актива.',
        'Проверьте обменный курс и комиссии конкретного пула.',
        'Одобрите и подпишите транзакцию в кошельке.'
      ],
      tip: 'Пулы с более низкими комиссиями идеально подходят для частых небольших обменов.'
    },
    'select-pair': {
      intro: 'Выберите торговую пару активов, которую хотите торговать, используя селектор пар.',
      steps: [
        'Нажмите на селектор торговой пары на торговом экране.',
        'Введите название или символ актива в поле поиска.',
        'Выберите первый актив из списка результатов.',
        'Повторите поиск для выбора второго актива пары.',
        'Подтвердите выбор для загрузки торгового экрана пары.'
      ],
      tip: 'Наиболее популярные пары с ALGO или USDC обычно предлагают наибольшую ликвидность.'
    },
    'price-chart': {
      intro: 'Свечной OHLCV-график отображает историческое движение цены с возможностью выбора временного фрейма.',
      steps: [
        'Откройте торговый экран для нужной пары.',
        'Найдите свечной график в центральной секции.',
        'Выберите желаемый временной фрейм (1м, 5м, 1ч, 1д и т.д.).',
        'Наведите мышь на свечи для просмотра детальных значений OHLCV.',
        'Используйте масштабирование для изучения конкретных периодов ценовой истории.'
      ],
      tip: 'Дневной временной фрейм идеально подходит для выявления долгосрочных тенденций.'
    },
    'asset-info': {
      intro: 'Просмотрите полные метаданные актива Algorand, включая ID, десятичные знаки, адрес создателя и другую информацию on-chain.',
      steps: [
        'Выберите актив из таблицы или на торговом экране.',
        'Нажмите на значок информации или раздел сведений об активе.',
        'Запишите числовой ID ASA для будущего использования.',
        'Проверьте количество десятичных знаков для точных вычислений.',
        'Проверьте адрес создателя для подтверждения подлинности актива.'
      ],
      tip: 'Всегда проверяйте ID актива в эксплорере Algorand, чтобы избежать поддельных токенов с похожими названиями.'
    },
    'share-pair': {
      intro: 'Скопируйте или поделитесь URL текущей торговой пары с другими пользователями.',
      steps: [
        'Перейдите на торговый экран пары, которой хотите поделиться.',
        'Нажмите кнопку «Поделиться» или «Копировать URL».',
        'URL автоматически копируется в буфер обмена.',
        'Вставьте ссылку в сообщение, письмо или социальные сети.',
        'Получатель ссылки увидит точно такую же торговую пару.'
      ],
      tip: 'Используйте эту функцию для обмена конкретными торговыми возможностями с сообществом.'
    },
    'liquidity-dashboard': {
      intro: 'Панель управления поставщиков ликвидности отображает все ваши активные позиции и сводную статистику LP-портфеля.',
      steps: [
        'Подключите кошелёк и перейдите на панель LP.',
        'Просмотрите список всех ваших активных позиций ликвидности.',
        'Проверьте накопленные комиссии для каждой позиции.',
        'Изучите общий заблокированный объём (TVL) в ваших позициях.',
        'Используйте кнопки действий для управления, добавления или удаления ликвидности.'
      ],
      tip: 'Регулярно проверяйте панель управления для сбора накопленных комиссий.'
    },
    'create-pool': {
      intro: 'Запустите новый пул CLAMM, выбрав два актива и уровень комиссии.',
      steps: [
        'На панели LP нажмите «Создать пул».',
        'Выберите первый актив, выполнив поиск по названию или ID.',
        'Выберите второй актив пары.',
        'Выберите подходящий уровень комиссии (0,01%, 0,05%, 0,3% или 1%).',
        'Ознакомьтесь с требуемыми затратами MBR для создания пула.',
        'Подпишите транзакцию создания в кошельке.'
      ],
      tip: 'Выбирайте уровень комиссии в соответствии с ожидаемой волатильностью пары.'
    },
    'add-liquidity-focused': {
      intro: 'Добавьте ликвидность в форме «Сосредоточенная», концентрируя средства вокруг текущей цены для максимальной эффективности капитала.',
      steps: [
        'Перейдите в свой пул на панели LP и выберите «Добавить ликвидность».',
        'Выберите форму «Сосредоточенная» из списка доступных форм.',
        'Система автоматически устанавливает узкий диапазон вокруг текущей цены.',
        'Введите сумму активов, которые хотите предоставить.',
        'Ознакомьтесь с расчётной эффективностью капитала и прогнозируемыми комиссиями.',
        'Подпишите транзакцию в кошельке для внесения ликвидности.'
      ],
      tip: 'Сосредоточенная форма обеспечивает максимальную эффективность капитала, но требует более частого мониторинга.'
    },
    'add-liquidity-spread': {
      intro: 'Добавьте ликвидность в форме «Распределённая» на более широкий ценовой диапазон.',
      steps: [
        'На панели добавления ликвидности выберите форму «Распределённая».',
        'Интерфейс отображает более широкий предварительно настроенный ценовой диапазон.',
        'При необходимости скорректируйте границы диапазона через поля ввода.',
        'Введите суммы активов для депозита.',
        'Проверьте распределение ликвидности на графике.',
        'Подпишите транзакцию для завершения депозита.'
      ],
      tip: 'Распределённая форма идеальна для тех, кто предпочитает меньше управления позицией.'
    },
    'add-liquidity-equal': {
      intro: 'Добавьте ликвидность в форме «Равномерная» на весь доступный ценовой диапазон.',
      steps: [
        'Выберите форму «Равномерная» на панели добавления ликвидности.',
        'Система автоматически устанавливает диапазон на весь доступный диапазон.',
        'Введите сумму активов для депозита.',
        'Убедитесь, что соотношение двух активов сбалансировано.',
        'Подпишите транзакцию для добавления равномерной ликвидности.'
      ],
      tip: 'Равномерная форма отлично подходит для новичков: работает как традиционный AMM.'
    },
    'add-liquidity-single': {
      intro: 'Добавьте ликвидность, используя только один актив. Система самостоятельно управляет необходимой конвертацией.',
      steps: [
        'Выберите форму «Один актив» на панели добавления ликвидности.',
        'Выберите, какой из двух активов пула хотите внести.',
        'Введите сумму выбранного актива.',
        'Система автоматически рассчитывает распределение в LP-позиции.',
        'Ознакомьтесь с влиянием на позицию и расчётными комиссиями.',
        'Подпишите транзакцию для завершения депозита одного актива.'
      ],
      tip: 'Добавление одного актива удобно, когда у вас есть только один токен из пары.'
    },
    'add-liquidity-wall': {
      intro: 'Добавьте ликвидность в форме «Стена», концентрируя все средства на конкретном ценовом уровне.',
      steps: [
        'Выберите форму «Стена» на панели добавления ликвидности.',
        'Установите целевую цену, на которой хотите сконцентрировать всю ликвидность.',
        'Введите сумму активов для депозита.',
        'Убедитесь, что выбранный ценовой уровень реалистичен и достижим.',
        'Подпишите транзакцию для создания позиции-стены.'
      ],
      tip: 'Форма «Стена» работает как лимитный ордер: ваша ликвидность используется только при достижении ценой указанного уровня.'
    },
    'remove-liquidity': {
      intro: 'Выведите свою LP-позицию, чтобы получить обратно оба актива, включая накопленные комиссии.',
      steps: [
        'На панели LP выберите позицию, которую хотите вывести.',
        'Нажмите «Удалить ликвидность».',
        'Укажите процент для вывода (частичный или 100% для полного вывода).',
        'Ознакомьтесь с расчётными суммами активов к получению.',
        'Подтвердите операцию и подпишите транзакцию в кошельке.',
        'Убедитесь, что активы были зачислены в ваш кошелёк.'
      ],
      tip: 'Выводите ликвидность перед значительными движениями цены, чтобы избежать непостоянных потерь.'
    },
    'manage-liquidity': {
      intro: 'Просматривайте и управляйте существующими LP-позициями, отслеживайте производительность и вносите изменения.',
      steps: [
        'Откройте панель LP и найдите позицию для управления.',
        'Нажмите на позицию для просмотра её полных деталей.',
        'Проверьте накопленные комиссии, текущую стоимость и ценовой диапазон.',
        'Используйте кнопки для добавления ликвидности, её удаления или сбора комиссий.',
        'Следите за тем, находится ли текущая цена в пределах вашего активного диапазона.'
      ],
      tip: 'Настройте ценовые оповещения, чтобы знать, когда цена приближается к границам вашей позиции.'
    },
    'review-before-sign': {
      intro: 'Перед подписью любой транзакции внимательно изучите все детали, отображаемые в интерфейсе и кошельке.',
      steps: [
        'Внимательно прочитайте сводку транзакции, отображаемую приложением.',
        'Проверьте сумму, актив и адрес получателя.',
        'Проверьте сетевые комиссии и расчётные общие затраты.',
        'Откройте кошелёк и ознакомьтесь с деталями предлагаемой транзакции.',
        'Подписывайте только если все детали соответствуют ожидаемым.',
        'При наличии сомнений отмените и проверьте перед продолжением.'
      ],
      tip: 'Никогда не подписывайте транзакции, которые вы не полностью понимаете или которые показывают суммы, отличные от ожидаемых.'
    },
    'liquidity-shapes': {
      intro: 'Biatec DEX предлагает 5 форм ликвидности для различных инвестиционных стратегий.',
      steps: [
        'Изучите форму «Сосредоточенная»: максимальная эффективность, требует частого мониторинга.',
        'Ознакомьтесь с формой «Распределённая»: хороший баланс эффективности и стабильности.',
        'Разберитесь в форме «Равномерная»: простейшая, охватывает весь диапазон.',
        'Изучите форму «Один актив»: депозит с использованием одного токена.',
        'Освойте форму «Стена»: ликвидность сконцентрирована на конкретной цене как пассивный лимитный ордер.',
        'Выберите форму, наиболее соответствующую вашей стратегии и времени, которое вы можете уделить управлению.'
      ],
      tip: 'Новичкам следует начать с формы «Равномерная» перед переходом к более продвинутым стратегиям.'
    },
    'lp-fee-tiers': {
      intro: 'Уровни комиссий LP определяют, сколько платят трейдеры за использование вашего пула.',
      steps: [
        'Ознакомьтесь с четырьмя доступными уровнями: 0,01%, 0,05%, 0,3%, 1%.',
        'Используйте 0,01% для стейблкоин-пар с минимальной волатильностью.',
        'Выбирайте 0,05% для пар с низкой волатильностью, таких как устоявшиеся активы.',
        'Выбирайте 0,3% для большинства стандартных пар со средней волатильностью.',
        'Используйте 1% для высоковолатильных или малоликвидных активов.'
      ],
      tip: 'Уровень 0,3% является наиболее используемым и обеспечивает наилучший баланс между привлечением ликвидности и объёмом торгов.'
    },
    'price-range': {
      intro: 'Установите пользовательский ценовой диапазон для вашей позиции сосредоточенной ликвидности.',
      steps: [
        'На панели добавления ликвидности найдите поля ценового диапазона.',
        'Введите минимальную цену в поле «Нижний предел».',
        'Введите максимальную цену в поле «Верхний предел».',
        'Убедитесь, что текущая цена находится в выбранном диапазоне.',
        'Проверьте ширину диапазона и расчётную эффективность капитала.',
        'Скорректируйте значения для достижения оптимального баланса вашей стратегии.'
      ],
      tip: 'Более узкий диапазон максимизирует заработанные комиссии, но увеличивает риск выхода цены за пределы диапазона.'
    },
    'precision-bins': {
      intro: 'Установите шаг бинов и точность цены для пула CLAMM.',
      steps: [
        'При создании пула найдите настройку шага бинов.',
        'Выберите меньшее значение шага для большей точности цены.',
        'Выберите большее значение для упрощённого управления с меньшим количеством бинов.',
        'Учтите, что более мелкие бины увеличивают вычислительные затраты транзакций.',
        'Ознакомьтесь с предварительным просмотром распределения бинов перед подтверждением.'
      ],
      tip: 'Для стейблкоин-пар используйте очень маленькие бины; для волатильных активов используйте более широкие бины для снижения затрат на управление.'
    },
    'pool-costs-mbr': {
      intro: 'Создание и управление пулами на Algorand требует минимального баланса (MBR).',
      steps: [
        'Перед созданием пула ознакомьтесь со сводкой затрат MBR.',
        'Убедитесь, что у вас достаточно ALGO для покрытия требуемого MBR.',
        'Понимайте, что MBR варьируется в зависимости от сложности контракта.',
        'Знайте, что MBR возвращается при закрытии пула.',
        'Учитывайте затраты MBR при финансовом планировании LP-операций.'
      ],
      tip: 'Всегда держите буфер ALGO в кошельке для покрытия MBR и комиссий за транзакции.'
    },
    'trader-dashboard': {
      intro: 'Панель управления трейдера отображает ваши личную торговую статистику, историю транзакций и совокупные показатели производительности.',
      steps: [
        'Подключите кошелёк и перейдите на панель трейдера.',
        'Просмотрите общий объём торгов и уплаченные комиссии.',
        'Прокрутите историю последних транзакций.',
        'Фильтруйте историю по активу, дате или типу операции.',
        'Анализируйте производительность для улучшения торговой стратегии.'
      ],
      tip: 'Используйте панель трейдера для отслеживания своей производительности во времени.'
    },
    'asset-opt-in': {
      intro: 'В Algorand необходимо выполнить opt-in для ASA, прежде чем получать его.',
      steps: [
        'Перейдите в раздел Opt-in активов в приложении.',
        'Найдите актив по названию или введите его числовой ID.',
        'Проверьте сведения об активе перед продолжением.',
        'Нажмите «Opt-in» и подпишите транзакцию в кошельке.',
        'Дождитесь on-chain подтверждения перед попыткой получения актива.',
        'Убедитесь, что актив появился в кошельке с нулевым балансом.'
      ],
      tip: 'Выполняйте opt-in только для проверенных и легитимных активов: каждый opt-in блокирует около 0,1 ALGO в качестве резерва.'
    },
    'copy-address': {
      intro: 'Скопируйте ваш адрес Algorand в буфер обмена одним щелчком для удобного обмена.',
      steps: [
        'Убедитесь, что кошелёк подключён к приложению.',
        'Найдите ваш сокращённый адрес в шапке или панели управления.',
        'Нажмите значок копирования рядом с адресом.',
        'Получите визуальное подтверждение копирования адреса.',
        'Вставьте адрес туда, куда необходимо.'
      ],
      tip: 'Всегда проверяйте первые и последние буквы вставленного адреса перед отправкой средств.'
    },
    'disconnect-wallet': {
      intro: 'Отключите кошелёк от приложения после завершения операций.',
      steps: [
        'Нажмите на ваш адрес или аватар кошелька в шапке.',
        'Выберите «Отключить» или «Выйти» в выпадающем меню.',
        'При необходимости подтвердите отключение.',
        'Убедитесь, что интерфейс вернулся в неподключённое состояние.',
        'Закройте браузер при использовании общего устройства для дополнительной безопасности.'
      ],
      tip: 'Всегда отключайтесь при использовании Biatec DEX на общедоступных компьютерах или совместно используемых устройствах.'
    },
    'switch-network': {
      intro: 'Переключайтесь между Mainnet, Testnet и Localnet для разработки, тестирования или реальной торговли.',
      steps: [
        'Откройте настройки или выбор сети в шапке.',
        'Выберите желаемую сеть: Mainnet, Testnet или Localnet.',
        'Дождитесь перезагрузки приложения с данными новой сети.',
        'Убедитесь, что кошелёк настроен на ту же сеть.',
        'Проверьте, что отображаемые активы и пулы соответствуют выбранной сети.'
      ],
      tip: 'Всегда используйте Testnet для тестирования новых стратегий перед работой с реальными средствами на Mainnet.'
    },
    'settings-blockchain': {
      intro: 'Настройте URL узла Algorand, URL индексера и API-ключ.',
      steps: [
        'Перейдите в настройки приложения.',
        'Найдите раздел настроек блокчейна.',
        'Введите URL узла Algorand в соответствующее поле.',
        'Введите URL индексера для поиска исторических данных.',
        'Добавьте API-ключ, если узел требует его для аутентификации.',
        'Сохраните настройки и проверьте подключение.'
      ],
      tip: 'Используйте выделенный узел или премиум-провайдера для лучшей производительности и надёжности.'
    },
    'settings-swap': {
      intro: 'Настройте параметры по умолчанию для свопа, включая допустимое проскальзывание.',
      steps: [
        'Откройте настройки приложения и выберите раздел свопа.',
        'Установите допустимое по умолчанию проскальзывание в процентах.',
        'Настройте любые другие доступные параметры свопа.',
        'Сохраните изменения для применения ко всем будущим свопам.',
        'Убедитесь, что настройки сохранены корректно.'
      ],
      tip: 'Допустимое проскальзывание 0,5%–1% хорошо работает для большинства рынков.'
    },
    'reset-settings': {
      intro: 'Восстановите все настройки до значений по умолчанию приложения.',
      steps: [
        'Перейдите в настройки приложения.',
        'Прокрутите до раздела сброса или восстановления.',
        'Нажмите кнопку «Восстановить настройки по умолчанию».',
        'Подтвердите операцию в диалоговом окне.',
        'Дождитесь перезагрузки приложения с настройками по умолчанию.',
        'Вручную перенастройте только необходимые пользовательские параметры.'
      ],
      tip: 'Перед сбросом запишите свои пользовательские настройки для их последующего восстановления.'
    },
    'tx-validity': {
      intro: 'Установите количество раундов действия для транзакций Algorand.',
      steps: [
        'Перейдите в расширенные настройки приложения.',
        'Найдите поле «Раунды действия транзакции».',
        'Введите желаемое количество раундов (обычно по умолчанию 1000).',
        'Учтите, что более высокие значения дают больше времени на подтверждение.',
        'Сохраните настройки для применения к будущим транзакциям.'
      ],
      tip: 'При перегрузке сети увеличьте количество раундов действия, чтобы дать транзакции больше времени.'
    },
    'localnet-dev': {
      intro: 'Запустите локальную сеть Algorand для разработки и тестирования без рисков.',
      steps: [
        'Установите AlgoKit, следуя официальной документации.',
        'Выполните команду для запуска Localnet в терминале.',
        'Подключите Biatec DEX к сети Localnet в настройках.',
        'Используйте предустановленные тестовые аккаунты с тестовым ALGO.',
        'Создайте тестовые активы и пулы для экспериментов с функциями.',
        'Сбросьте Localnet для начала с чистого состояния при необходимости.'
      ],
      tip: 'Localnet — идеальный инструмент для разработчиков: позволяет тестировать смарт-контракты без реальных затрат.'
    },
    'about': {
      intro: 'Раздел «О нас» отображает текущую версию приложения, информацию о команде Biatec и ссылки на официальные ресурсы.',
      steps: [
        'Откройте меню настроек или перейдите на страницу «О нас».',
        'Просмотрите текущий номер версии приложения.',
        'Ознакомьтесь с информацией о команде разработчиков Biatec.',
        'Перейдите по ссылкам на официальные ресурсы (сайт, GitHub, документация).',
        'Найдите ссылки на каналы поддержки и сообщества.'
      ],
      tip: 'Периодически проверяйте версию приложения и обновляйтесь для использования последних функций.'
    },
    'documentation': {
      intro: 'Ознакомьтесь с официальной документацией Biatec DEX для получения подробных руководств, технических справочников и обучающих материалов.',
      steps: [
        'Нажмите ссылку на документацию в меню или разделе «О нас».',
        'Используйте строку поиска для нахождения конкретных тем.',
        'Перемещайтесь между разделами: Руководство пользователя, Технический справочник, Обучающие материалы.',
        'Читайте руководства по функциям, которые планируете использовать.',
        'Ознакомьтесь с разделом FAQ для ответов на часто задаваемые вопросы.'
      ],
      tip: 'Добавьте официальную документацию в закладки для быстрого доступа при необходимости технических справок.'
    },
    'security-best-practices': {
      intro: 'Следуйте лучшим практикам безопасности для защиты ваших средств на Biatec DEX.',
      steps: [
        'Всегда проверяйте URL приложения перед подключением кошелька.',
        'Внимательно изучайте каждую транзакцию перед её подписью.',
        'Никогда не делитесь своей сид-фразой или приватными ключами ни с кем.',
        'Рассмотрите использование мультисига для крупных сумм ликвидности.',
        'Обновляйте прошивку аппаратного кошелька до последней версии.',
        'Используйте защищённые соединения (HTTPS) и надёжные сети для операций.'
      ],
      tip: 'Аппаратный кошелёк, например Ledger, обеспечивает максимальную безопасность для значительных сумм.'
    },
    'help-center': {
      intro: 'Центр помощи Biatec DEX — это руководство с функцией поиска, охватывающее все функции платформы.',
      steps: [
        'Откройте центр помощи из главного меню или шапки.',
        'Используйте строку поиска для нахождения руководств по ключевым словам.',
        'Просматривайте категории для изучения связанных тем.',
        'Нажмите на руководство для чтения подробных пошаговых инструкций.',
        'Используйте советы в конце каждого руководства для продвинутых рекомендаций.'
      ],
      tip: 'Если вы не нашли ответ в центре помощи, свяжитесь с командой Biatec через официальные каналы сообщества.'
    }
  }
  ,
  zh: {
    'explore-assets': {
      intro: '资产表格提供所有可用交易对的完整概览，包括TVL、价格、24小时成交量和手续费。',
      steps: [
        '打开主屏幕，进入资产列表部分。',
        '点击列标题按TVL、价格或成交量排序表格。',
        '使用搜索栏按名称或符号筛选资产。',
        '点击资产行打开对应的交易屏幕。',
        '查看手续费和成交量来评估可用流动性。'
      ],
      tip: '按24小时成交量排序可帮助您找到当天交易最活跃的资产。'
    },
    'find-asset-by-id': {
      intro: '通过输入唯一数字ID来查找任何Algorand标准资产（ASA）。',
      steps: [
        '前往界面中的资产搜索部分。',
        '在相应字段中输入ASA的数字ID。',
        '按回车键或点击搜索按钮。',
        '验证显示的资产详情（名称、小数位数、创建者）。',
        '选择资产开始交易或添加流动性。'
      ],
      tip: '您可以在Allo.info或AlgoExplorer上通过搜索代币名称找到ASA的ID。'
    },
    'connect-wallet': {
      intro: '连接您的Algorand钱包以访问Biatec DEX的所有功能。',
      steps: [
        '点击右上角的"连接钱包"按钮。',
        '选择您偏好的提供商：Pera、Defly、Lute或电子邮件（ARC-76）。',
        '在钱包中批准连接请求，或输入电子邮件凭据。',
        '确认您的Algorand地址正确显示在页面标题中。',
        '继续前请确保您在正确的网络上。'
      ],
      tip: '推荐使用Pera Wallet，它提供内置QR码支持的最佳移动体验。'
    },
    'switch-language': {
      intro: '直接在设置或应用程序标题中更改界面语言。',
      steps: [
        '点击标题中的语言图标或设置菜单。',
        '从下拉列表中选择所需语言。',
        '界面将立即更新为所选语言。',
        '确认所有文本在新语言中正确显示。'
      ],
      tip: '语言偏好保存在本地，在会话之间保持不变。'
    },
    'switch-theme': {
      intro: '使用标题中的月亮/太阳图标在浅色和深色主题之间切换。',
      steps: [
        '在标题中找到月亮（深色主题）或太阳（浅色主题）图标。',
        '点击图标在浅色和深色主题之间切换。',
        '主题立即应用于整个界面。',
        '偏好自动保存在浏览器中。'
      ],
      tip: '深色主题适合长时间交易会话，可减少视觉疲劳。'
    },
    'trade-screen': {
      intro: '主交易屏幕将订单表单、OHLCV图表、市场深度和最近交易流整合在一个视图中。',
      steps: [
        '使用顶部的货币对选择器选择您要交易的资产对。',
        '查看K线图分析价格走势。',
        '检查市场深度了解可用流动性。',
        '在侧边的订单表单中输入所需金额。',
        '确认操作前检查估计滑点。',
        '在钱包中签署交易以完成兑换。'
      ],
      tip: '监控市场深度图表以识别支撑位和阻力位。'
    },
    'buy-order': {
      intro: '提交买单（兑换），指定金额和最大可接受滑点。',
      steps: [
        '在交易屏幕的订单表单中选择"买入"标签。',
        '输入您想购买的资产金额。',
        '设置最大可接受滑点容差。',
        '查看显示的估计价格和手续费。',
        '点击"买入"并在钱包中签署交易。'
      ],
      tip: '低滑点可保护价格，但设置过低可能导致交易失败。'
    },
    'sell-order': {
      intro: '提交卖单，指定要出售的资产金额和最大滑点。',
      steps: [
        '在交易屏幕的订单表单中选择"卖出"标签。',
        '输入您想出售的资产金额。',
        '查看字段旁边显示的可用余额。',
        '设置所需的滑点容差。',
        '点击"卖出"并在钱包中批准交易。'
      ],
      tip: '使用"最大"功能在一次操作中出售全部可用余额。'
    },
    'market-depth': {
      intro: '市场深度图表可视化不同价格水平的可用流动性。',
      steps: [
        '在交易屏幕上找到市场深度图表。',
        '观察绿色（买单）和红色（卖单）曲线。',
        '将鼠标悬停在图表上查看每个价格的可用数量。',
        '使用深度估计您的订单对价格的影响。',
        '识别高流动性水平作为潜在支撑位或阻力位。'
      ],
      tip: '陡峭的深度曲线表明流动性少，大额订单的滑点更大。'
    },
    'recent-trades': {
      intro: '最近交易流实时显示所选货币对上最近执行的交易。',
      steps: [
        '查看交易屏幕上的最近交易面板。',
        '注意颜色：绿色表示买入，红色表示卖出。',
        '查看价格列了解交易执行水平。',
        '监控交易规模以评估市场活动。',
        '在交易前使用此流确认市场活跃。'
      ],
      tip: '同一方向的一系列大型连续交易可能预示着即将到来的价格波动。'
    },
    'pool-swap': {
      intro: '直接通过特定流动性池执行兑换。',
      steps: [
        '前往您想使用的池的屏幕。',
        '在池中选择兑换功能。',
        '输入输入资产的金额。',
        '验证该特定池的汇率和手续费。',
        '在钱包中批准并签署交易。'
      ],
      tip: '手续费较低的池非常适合频繁的小额兑换。'
    },
    'select-pair': {
      intro: '使用货币对选择器选择您想交易的资产对。',
      steps: [
        '点击交易屏幕上的资产对选择器。',
        '在搜索字段中输入资产名称或符号。',
        '从结果列表中选择第一个资产。',
        '重复搜索选择该对的第二个资产。',
        '确认选择以加载该货币对的交易屏幕。'
      ],
      tip: '与ALGO或USDC配对的最受欢迎货币对通常提供最大流动性。'
    },
    'price-chart': {
      intro: 'OHLCV K线图显示历史价格走势，并提供时间框架选择选项。',
      steps: [
        '打开所需货币对的交易屏幕。',
        '在中央部分找到K线图。',
        '选择所需时间框架（1分、5分、1小时、1天等）。',
        '将鼠标悬停在蜡烛上查看详细OHLCV数值。',
        '使用缩放功能查看价格历史的特定时期。'
      ],
      tip: '日线时间框架非常适合识别长期趋势。'
    },
    'asset-info': {
      intro: '查看Algorand资产的完整元数据，包括ID、小数位数、创建者地址和其他链上信息。',
      steps: [
        '从表格或交易屏幕中选择一个资产。',
        '点击信息图标或资产详情部分。',
        '记录ASA数字ID以备将来参考。',
        '验证小数位数以进行精确计算。',
        '检查创建者地址以验证资产真实性。'
      ],
      tip: '始终在Algorand浏览器上验证资产ID，以避免名称相似的假冒代币。'
    },
    'share-pair': {
      intro: '将当前交易货币对的URL复制或分享给其他用户。',
      steps: [
        '导航到您想分享的货币对的交易屏幕。',
        '点击分享或复制URL按钮。',
        'URL自动复制到剪贴板。',
        '将链接粘贴到消息、电子邮件或社交媒体中。',
        '收到链接的人将看到完全相同的交易货币对。'
      ],
      tip: '使用此功能与您的社区分享特定的交易机会。'
    },
    'liquidity-dashboard': {
      intro: '流动性提供者仪表板显示您的所有活跃头寸以及LP投资组合的汇总统计数据。',
      steps: [
        '连接钱包并导航到LP仪表板。',
        '查看所有活跃流动性头寸的列表。',
        '检查每个头寸的累积手续费。',
        '查看您头寸中的总锁定价值（TVL）。',
        '使用操作按钮管理、添加或移除流动性。'
      ],
      tip: '定期检查您的仪表板以收集累积的手续费。'
    },
    'create-pool': {
      intro: '通过选择两种资产和手续费档位来启动新的CLAMM池。',
      steps: [
        '在LP仪表板中点击"创建池"。',
        '通过名称或ID搜索选择第一个资产。',
        '选择该对的第二个资产。',
        '选择适当的手续费档位（0.01%、0.05%、0.3%或1%）。',
        '查看创建池所需的MBR费用。',
        '在钱包中签署创建交易。'
      ],
      tip: '根据货币对的预期波动性选择与之一致的手续费档位。'
    },
    'add-liquidity-focused': {
      intro: '以"集中"形态添加流动性，将资金集中在当前价格附近以最大化资本效率。',
      steps: [
        '前往LP仪表板中的池并选择"添加流动性"。',
        '从可用形态列表中选择"集中"形态。',
        '系统自动在当前价格附近预设一个窄范围。',
        '输入您想提供的资产金额。',
        '查看估计资本效率和预期手续费。',
        '在钱包中签署交易以存入流动性。'
      ],
      tip: '集中形态提供最高资本效率，但需要更频繁的监控。'
    },
    'add-liquidity-spread': {
      intro: '以"分散"形态在更宽的价格范围内添加流动性。',
      steps: [
        '在添加流动性面板中选择"分散"形态。',
        '界面显示预配置的更宽价格范围。',
        '如有必要，通过输入字段调整范围边界。',
        '输入要存入的资产金额。',
        '查看图表中显示的流动性分布。',
        '签署交易完成存款。'
      ],
      tip: '分散形态非常适合不需要频繁维护头寸的用户。'
    },
    'add-liquidity-equal': {
      intro: '以"均匀"形态在整个可用价格范围内添加流动性。',
      steps: [
        '在添加流动性面板中选择"均匀"形态。',
        '系统自动将范围设置为整个可用范围。',
        '输入要存入的资产金额。',
        '验证两种资产的比例是否平衡。',
        '签署交易添加均匀流动性。'
      ],
      tip: '均匀形态非常适合初学者：功能类似于传统AMM。'
    },
    'add-liquidity-single': {
      intro: '使用单一资产添加流动性。系统在内部管理必要的转换。',
      steps: [
        '在添加流动性面板中选择"单资产"形态。',
        '选择您想存入池中的两种资产之一。',
        '输入所选资产的金额。',
        '系统自动计算LP头寸中的分布。',
        '查看对头寸的影响和估计手续费。',
        '签署交易完成单资产存款。'
      ],
      tip: '当您只有一种代币时，单资产添加非常方便。'
    },
    'add-liquidity-wall': {
      intro: '以"墙壁"形态添加流动性，将所有资金集中在特定价格水平。',
      steps: [
        '在添加流动性面板中选择"墙壁"形态。',
        '设置您想集中所有流动性的目标价格。',
        '输入要存入的资产金额。',
        '验证所选价格水平是否现实可达。',
        '签署交易创建墙壁头寸。'
      ],
      tip: '墙壁形态充当限价单：您的流动性仅在价格达到指定水平时使用。'
    },
    'remove-liquidity': {
      intro: '撤回您的LP头寸以收回两种资产，包括累积的手续费。',
      steps: [
        '在LP仪表板中选择您想撤回的头寸。',
        '点击"移除流动性"。',
        '指定要撤回的百分比（部分或100%全额撤回）。',
        '查看您将收到的估计资产金额。',
        '确认操作并在钱包中签署交易。',
        '验证资产已记入您的钱包。'
      ],
      tip: '在重大价格波动前撤出流动性以避免无常损失。'
    },
    'manage-liquidity': {
      intro: '查看和管理您现有的LP头寸，监控绩效并进行调整。',
      steps: [
        '打开LP仪表板并找到要管理的头寸。',
        '点击头寸查看其完整详情。',
        '检查累积手续费、当前价值和价格范围。',
        '使用按钮添加流动性、移除流动性或收集手续费。',
        '监控当前价格是否在您的活跃范围内。'
      ],
      tip: '设置价格提醒，以便在价格接近您头寸边界时收到通知。'
    },
    'review-before-sign': {
      intro: '在签署任何交易之前，仔细检查界面和钱包中显示的所有详情。',
      steps: [
        '仔细阅读应用程序显示的交易摘要。',
        '验证金额、资产和目标地址。',
        '检查网络手续费和估计总成本。',
        '打开钱包并查看拟议交易的详情。',
        '只有在所有详情符合预期时才签署。',
        '如有疑问，取消并在继续前先验证。'
      ],
      tip: '永远不要签署您完全不理解或显示金额与预期不符的交易。'
    },
    'liquidity-shapes': {
      intro: 'Biatec DEX提供5种流动性形态以适应不同的投资策略。',
      steps: [
        '学习"集中"形态：最高效率，需要频繁监控。',
        '探索"分散"形态：效率与稳定性的良好平衡。',
        '了解"均匀"形态：最简单，覆盖整个范围。',
        '分析"单资产"形态：使用单一代币存款。',
        '学习"墙壁"形态：流动性集中在特定价格作为被动限价单。',
        '选择最适合您策略和可用于管理时间的形态。'
      ],
      tip: '初学者应该从"均匀"形态开始，然后再转向更高级的策略。'
    },
    'lp-fee-tiers': {
      intro: 'LP手续费档位决定了交易者使用您的池支付多少费用。',
      steps: [
        '了解四个可用档位：0.01%、0.05%、0.3%、1%。',
        '对波动性极小的稳定币对使用0.01%。',
        '对成熟资产等低波动性对选择0.05%。',
        '对大多数中等波动性的标准对选择0.3%。',
        '对高度波动或低流动性资产使用1%。'
      ],
      tip: '0.3%档位使用最广泛，在吸引流动性和交易量之间提供最佳平衡。'
    },
    'price-range': {
      intro: '为您的集中流动性头寸设置自定义价格范围。',
      steps: [
        '在添加流动性面板中找到价格范围字段。',
        '在"下限"字段中输入最低价格。',
        '在"上限"字段中输入最高价格。',
        '验证当前价格在选定范围内。',
        '检查范围宽度和估计资本效率。',
        '调整数值以找到您策略的最佳平衡。'
      ],
      tip: '更窄的范围可以最大化赚取的手续费，但增加了价格超出范围的风险。'
    },
    'precision-bins': {
      intro: '设置CLAMM池的价格精度步长和bins。',
      steps: [
        '在创建池时找到bin步长设置。',
        '选择较小的步长值以获得更高的价格精度。',
        '选择较大的值以减少bins简化管理。',
        '考虑到更小的bins会增加交易的计算成本。',
        '在确认前查看bins分布预览。'
      ],
      tip: '对稳定币对使用非常小的bins；对波动性资产使用更宽的bins以降低管理成本。'
    },
    'pool-costs-mbr': {
      intro: '在Algorand上创建和管理池需要最低余额要求（MBR）。',
      steps: [
        '在创建池之前阅读MBR成本摘要。',
        '确保您有足够的ALGO来支付所需的MBR。',
        '了解MBR根据合约复杂性而变化。',
        '知道MBR在池关闭时会退还。',
        '在LP运营的财务规划中包含MBR成本。'
      ],
      tip: '始终在钱包中保留ALGO缓冲以支付MBR和交易手续费。'
    },
    'trader-dashboard': {
      intro: '交易者仪表板显示您的个人交易统计数据、交易历史和随时间变化的综合绩效。',
      steps: [
        '连接钱包并导航到交易者仪表板。',
        '查看总交易量和已支付手续费。',
        '浏览最近交易历史。',
        '按资产、日期或操作类型筛选历史记录。',
        '分析绩效以改进交易策略。'
      ],
      tip: '使用交易者仪表板随时间追踪您的绩效。'
    },
    'asset-opt-in': {
      intro: '在Algorand上，您必须先选择加入ASA才能接收它。',
      steps: [
        '前往应用程序中的资产选择加入部分。',
        '按名称搜索资产或输入其数字ID。',
        '继续前验证资产详情。',
        '点击"选择加入"并在钱包中签署交易。',
        '在尝试接收资产前等待链上确认。',
        '验证资产以零余额出现在您的钱包中。'
      ],
      tip: '只对经过验证的合法资产进行选择加入：每次选择加入会锁定约0.1 ALGO作为储备。'
    },
    'copy-address': {
      intro: '一键将您的Algorand地址复制到剪贴板以便轻松分享。',
      steps: [
        '确保钱包已连接到应用程序。',
        '在标题或仪表板中找到您的缩写地址。',
        '点击地址旁边的复制图标。',
        '收到地址已复制的视觉确认。',
        '在需要的地方粘贴地址。'
      ],
      tip: '发送资金前始终验证粘贴地址的前几位和后几位字母。'
    },
    'disconnect-wallet': {
      intro: '完成操作后断开钱包与应用程序的连接。',
      steps: [
        '点击标题中的您的地址或钱包头像。',
        '从下拉菜单中选择"断开连接"或"退出"。',
        '如有要求，确认断开连接。',
        '验证界面返回未连接状态。',
        '如果使用共享设备，关闭浏览器以提供额外安全性。'
      ],
      tip: '在公共计算机或共享设备上使用Biatec DEX时，请始终断开连接。'
    },
    'switch-network': {
      intro: '在主网、测试网和本地网之间切换以进行开发、测试或实际交易。',
      steps: [
        '打开标题中的设置或网络选择器。',
        '选择所需网络：主网、测试网或本地网。',
        '等待应用程序使用新网络数据重新加载。',
        '确认钱包配置在同一网络上。',
        '验证显示的资产和池与所选网络对应。'
      ],
      tip: '在主网上使用真实资金操作之前，始终使用测试网测试新策略。'
    },
    'settings-blockchain': {
      intro: '配置Algorand节点URL、索引器URL和API密钥。',
      steps: [
        '前往应用程序设置。',
        '找到区块链设置部分。',
        '在相应字段中输入Algorand节点URL。',
        '输入用于历史数据查询的索引器URL。',
        '如果节点需要身份验证，添加API密钥。',
        '保存设置并验证连接。'
      ],
      tip: '使用专用节点或高级提供商以获得更好的性能和可靠性。'
    },
    'settings-swap': {
      intro: '配置兑换的默认设置，包括滑点容差。',
      steps: [
        '访问应用程序设置并选择兑换部分。',
        '以百分比设置默认滑点容差。',
        '配置任何其他可用的兑换参数。',
        '保存更改以应用于所有未来的兑换。',
        '验证设置已正确保存。'
      ],
      tip: '0.5%-1%的滑点容差适用于大多数市场。'
    },
    'reset-settings': {
      intro: '将所有设置恢复为应用程序默认值。',
      steps: [
        '前往应用程序设置。',
        '滚动到重置或恢复部分。',
        '点击"恢复默认设置"按钮。',
        '在对话框中确认操作。',
        '等待应用程序以默认设置重新加载。',
        '仅手动重新配置必要的自定义设置。'
      ],
      tip: '重置前记录您的自定义设置，以便之后轻松重新输入。'
    },
    'tx-validity': {
      intro: '设置Algorand交易的有效轮次数。',
      steps: [
        '前往应用程序高级设置。',
        '找到"交易有效轮次"字段。',
        '输入所需的轮次数（通常默认为1000）。',
        '考虑更高的值给予更多确认时间。',
        '保存设置以应用于未来的交易。'
      ],
      tip: '在网络拥堵条件下，增加有效轮次以给交易更多时间。'
    },
    'localnet-dev': {
      intro: '运行本地Algorand网络进行无风险的开发和测试。',
      steps: [
        '按照官方文档安装AlgoKit。',
        '在终端运行命令启动本地网。',
        '在设置中将Biatec DEX连接到本地网络。',
        '使用预设的测试账户和测试ALGO。',
        '创建测试资产和池来实验功能。',
        '必要时重置本地网以全新状态开始。'
      ],
      tip: '本地网是开发者的理想工具：允许在没有真实成本的情况下测试智能合约。'
    },
    'about': {
      intro: '"关于"部分显示当前应用程序版本、Biatec团队信息和官方资源链接。',
      steps: [
        '打开设置菜单或导航到"关于"页面。',
        '查看当前应用程序版本号。',
        '阅读Biatec开发团队的信息。',
        '访问官方资源的链接（网站、GitHub、文档）。',
        '找到支持和社区频道的链接。'
      ],
      tip: '定期检查应用程序版本并更新以受益于最新功能。'
    },
    'documentation': {
      intro: '探索Biatec DEX的官方文档，获取详细指南、技术参考和教程。',
      steps: [
        '点击菜单或"关于"部分中的文档链接。',
        '使用搜索栏查找特定主题。',
        '在各部分之间导航：用户指南、技术参考、教程。',
        '阅读您打算使用的功能指南。',
        '查阅常见问题解答部分获取常见问题的答案。'
      ],
      tip: '将官方文档加入书签以便在需要技术参考时快速访问。'
    },
    'security-best-practices': {
      intro: '遵循最佳安全实践以保护您在Biatec DEX上的资金。',
      steps: [
        '连接钱包前始终验证应用程序URL。',
        '签署每笔交易前仔细检查。',
        '永远不要与任何人分享您的助记词或私钥。',
        '对于大量流动性，考虑使用多重签名。',
        '将硬件钱包固件更新到最新版本。',
        '使用安全连接（HTTPS）和可信网络进行操作。'
      ],
      tip: '像Ledger这样的硬件钱包为重要金额提供最高级别的安全性。'
    },
    'help-center': {
      intro: 'Biatec DEX帮助中心是一个可搜索的指南，涵盖平台的所有功能。',
      steps: [
        '从主菜单或标题打开帮助中心。',
        '使用搜索栏通过关键词查找指南。',
        '浏览类别探索相关主题。',
        '点击指南阅读详细的分步说明。',
        '使用每个指南底部的提示获取高级建议。'
      ],
      tip: '如果在帮助中心找不到答案，请通过官方社区渠道联系Biatec团队。'
    }
  }
  ,
  ko: {
    'explore-assets': {
      intro: '자산 테이블은 TVL, 가격, 24시간 거래량 및 수수료를 포함한 모든 거래 가능한 쌍의 전체 개요를 제공합니다.',
      steps: [
        '메인 화면을 열고 자산 섹션으로 이동합니다.',
        '열 헤더를 클릭하여 TVL, 가격 또는 거래량 순으로 테이블을 정렬합니다.',
        '검색 창을 사용하여 이름 또는 심볼로 자산을 필터링합니다.',
        '자산 행을 클릭하여 해당 거래 화면을 엽니다.',
        '수수료와 거래량을 확인하여 사용 가능한 유동성을 평가합니다.'
      ],
      tip: '24시간 거래량 순으로 정렬하면 당일 가장 활발하게 거래되는 자산을 찾을 수 있습니다.'
    },
    'find-asset-by-id': {
      intro: '고유한 숫자 ID를 입력하여 Algorand 표준 자산(ASA)을 검색합니다.',
      steps: [
        '인터페이스의 자산 검색 섹션으로 이동합니다.',
        '해당 필드에 ASA의 숫자 ID를 입력합니다.',
        'Enter 키를 누르거나 검색 버튼을 클릭합니다.',
        '표시되는 자산 세부 정보(이름, 소수점 자릿수, 생성자)를 확인합니다.',
        '거래 시작 또는 유동성 추가를 위해 자산을 선택합니다.'
      ],
      tip: 'Allo.info 또는 AlgoExplorer에서 토큰 이름으로 검색하면 ASA ID를 찾을 수 있습니다.'
    },
    'connect-wallet': {
      intro: 'Algorand 지갑을 연결하여 Biatec DEX의 모든 기능에 액세스합니다.',
      steps: [
        '오른쪽 상단의 "지갑 연결" 버튼을 클릭합니다.',
        '선호하는 공급자를 선택합니다: Pera, Defly, Lute 또는 이메일(ARC-76).',
        '지갑에서 연결 요청을 승인하거나 이메일 자격 증명을 입력합니다.',
        'Algorand 주소가 헤더에 올바르게 표시되는지 확인합니다.',
        '진행하기 전에 올바른 네트워크에 있는지 확인합니다.'
      ],
      tip: '내장 QR 코드 지원으로 최상의 모바일 경험을 위해 Pera Wallet을 추천합니다.'
    },
    'switch-language': {
      intro: '설정 또는 앱 헤더에서 직접 인터페이스 언어를 변경합니다.',
      steps: [
        '헤더에서 언어 아이콘 또는 설정 메뉴를 클릭합니다.',
        '드롭다운 목록에서 원하는 언어를 선택합니다.',
        '인터페이스가 선택한 언어로 즉시 업데이트됩니다.',
        '새 언어에서 모든 텍스트가 올바르게 표시되는지 확인합니다.'
      ],
      tip: '언어 기본 설정은 로컬에 저장되어 세션 간에 유지됩니다.'
    },
    'switch-theme': {
      intro: '헤더의 달/태양 아이콘을 사용하여 라이트 테마와 다크 테마 간에 전환합니다.',
      steps: [
        '헤더에서 달(다크 테마) 또는 태양(라이트 테마) 아이콘을 찾습니다.',
        '아이콘을 클릭하여 라이트와 다크 테마 간에 전환합니다.',
        '테마가 전체 인터페이스에 즉시 적용됩니다.',
        '기본 설정이 브라우저에 자동으로 저장됩니다.'
      ],
      tip: '다크 테마는 장시간 거래 세션에서 눈의 피로를 줄이는 데 권장됩니다.'
    },
    'trade-screen': {
      intro: '메인 거래 화면은 주문 양식, OHLCV 차트, 시장 깊이 및 최근 거래 피드를 하나의 통합 뷰에 결합합니다.',
      steps: [
        '상단의 페어 선택기를 사용하여 거래할 자산 쌍을 선택합니다.',
        '가격 움직임을 분석하기 위해 캔들스틱 차트를 봅니다.',
        '사용 가능한 유동성을 이해하기 위해 시장 깊이를 확인합니다.',
        '옆의 주문 양식에 원하는 금액을 입력합니다.',
        '작업을 확인하기 전에 예상 슬리피지를 확인합니다.',
        '스왑을 완료하기 위해 지갑에서 거래에 서명합니다.'
      ],
      tip: '지지 및 저항 수준을 식별하기 위해 시장 깊이 차트를 모니터링합니다.'
    },
    'buy-order': {
      intro: '금액과 최대 허용 슬리피지를 지정하여 매수 주문(스왑)을 제출합니다.',
      steps: [
        '거래 화면의 주문 양식에서 "매수" 탭을 선택합니다.',
        '구매하려는 자산 금액을 입력합니다.',
        '최대 허용 슬리피지 허용 오차를 설정합니다.',
        '표시된 예상 가격과 수수료를 확인합니다.',
        '"매수"를 클릭하고 지갑에서 거래에 서명합니다.'
      ],
      tip: '낮은 슬리피지는 가격을 보호하지만, 너무 낮으면 거래가 실패할 수 있습니다.'
    },
    'sell-order': {
      intro: '판매할 자산 금액과 최대 슬리피지를 지정하여 매도 주문을 제출합니다.',
      steps: [
        '거래 화면의 주문 양식에서 "매도" 탭을 선택합니다.',
        '판매하려는 자산 금액을 입력합니다.',
        '필드 옆에 표시된 사용 가능한 잔액을 확인합니다.',
        '원하는 슬리피지 허용 오차를 설정합니다.',
        '"매도"를 클릭하고 지갑에서 거래를 승인합니다.'
      ],
      tip: '"최대" 기능을 사용하여 한 번의 작업으로 자산의 전체 사용 가능한 잔액을 판매합니다.'
    },
    'market-depth': {
      intro: '시장 깊이 차트는 다양한 가격 수준에서 사용 가능한 유동성을 시각화합니다.',
      steps: [
        '거래 화면에서 시장 깊이 차트를 찾습니다.',
        '녹색(매수 주문) 및 빨간색(매도 주문) 곡선을 관찰합니다.',
        '마우스를 차트 위에 올려 각 가격에서 사용 가능한 수량을 봅니다.',
        '깊이를 사용하여 주문의 가격 영향을 추정합니다.',
        '잠재적 지지 또는 저항으로 높은 유동성 수준을 식별합니다.'
      ],
      tip: '가파른 깊이 곡선은 유동성이 적고 대규모 주문에 대한 슬리피지가 더 크다는 것을 나타냅니다.'
    },
    'recent-trades': {
      intro: '최근 거래 피드는 선택한 페어에서 최근 실행된 거래를 실시간으로 표시합니다.',
      steps: [
        '거래 화면의 최근 거래 패널을 봅니다.',
        '색상에 주목합니다: 녹색은 매수, 빨간색은 매도를 나타냅니다.',
        '가격 열을 확인하여 거래 실행 수준을 봅니다.',
        '시장 활동을 평가하기 위해 거래 규모를 모니터링합니다.',
        '거래 전에 이 피드를 사용하여 시장이 활성 상태인지 확인합니다.'
      ],
      tip: '같은 방향의 연속적인 대규모 거래 시리즈는 임박한 가격 움직임을 나타낼 수 있습니다.'
    },
    'pool-swap': {
      intro: '특정 유동성 풀을 통해 직접 스왑을 실행합니다.',
      steps: [
        '사용하려는 풀의 화면으로 이동합니다.',
        '풀 내에서 스왑 기능을 선택합니다.',
        '입력 자산의 금액을 입력합니다.',
        '해당 특정 풀의 환율과 수수료를 확인합니다.',
        '지갑에서 거래를 승인하고 서명합니다.'
      ],
      tip: '수수료가 낮은 풀은 소액의 빈번한 스왑에 이상적입니다.'
    },
    'select-pair': {
      intro: '페어 선택기를 사용하여 거래하려는 자산 쌍을 선택합니다.',
      steps: [
        '거래 화면의 자산 쌍 선택기를 클릭합니다.',
        '검색 필드에 자산 이름 또는 심볼을 입력합니다.',
        '결과 목록에서 첫 번째 자산을 선택합니다.',
        '쌍의 두 번째 자산을 선택하기 위해 검색을 반복합니다.',
        '해당 페어의 거래 화면을 로드하기 위해 선택을 확인합니다.'
      ],
      tip: 'ALGO 또는 USDC와 쌍을 이루는 가장 인기 있는 페어는 일반적으로 가장 높은 유동성을 제공합니다.'
    },
    'price-chart': {
      intro: 'OHLCV 캔들스틱 차트는 시간 프레임 선택 옵션과 함께 역사적인 가격 움직임을 표시합니다.',
      steps: [
        '원하는 페어의 거래 화면을 엽니다.',
        '중앙 섹션에서 캔들스틱 차트를 찾습니다.',
        '원하는 시간 프레임을 선택합니다(1분, 5분, 1시간, 1일 등).',
        '캔들 위에 마우스를 올려 자세한 OHLCV 값을 봅니다.',
        '확대/축소를 사용하여 가격 기록의 특정 기간을 검사합니다.'
      ],
      tip: '일별 시간 프레임은 장기 추세를 식별하는 데 이상적입니다.'
    },
    'asset-info': {
      intro: 'ID, 소수점 자릿수, 생성자 주소 및 기타 온체인 정보를 포함한 Algorand 자산의 전체 메타데이터를 봅니다.',
      steps: [
        '테이블이나 거래 화면에서 자산을 선택합니다.',
        '정보 아이콘 또는 자산 세부 정보 섹션을 클릭합니다.',
        '나중에 참조할 수 있도록 ASA 숫자 ID를 기록합니다.',
        '정밀 계산을 위해 소수점 자릿수를 확인합니다.',
        '자산 진위 여부를 검증하기 위해 생성자 주소를 확인합니다.'
      ],
      tip: '비슷한 이름의 가짜 토큰을 피하기 위해 항상 Algorand 탐색기에서 자산 ID를 확인합니다.'
    },
    'share-pair': {
      intro: '현재 거래 페어의 URL을 복사하거나 다른 사용자와 공유합니다.',
      steps: [
        '공유하려는 페어의 거래 화면으로 이동합니다.',
        '공유 또는 URL 복사 버튼을 클릭합니다.',
        'URL이 자동으로 클립보드에 복사됩니다.',
        '링크를 메시지, 이메일 또는 소셜 미디어에 붙여넣습니다.',
        '링크를 받는 사람은 정확히 동일한 거래 페어를 보게 됩니다.'
      ],
      tip: '이 기능을 사용하여 커뮤니티와 특정 거래 기회를 공유합니다.'
    },
    'liquidity-dashboard': {
      intro: '유동성 공급자 대시보드는 모든 활성 포지션과 LP 포트폴리오의 집계 통계를 표시합니다.',
      steps: [
        '지갑을 연결하고 LP 대시보드로 이동합니다.',
        '모든 활성 유동성 포지션 목록을 봅니다.',
        '각 포지션의 누적 수수료를 확인합니다.',
        '포지션의 총 잠긴 가치(TVL)를 검사합니다.',
        '작업 버튼을 사용하여 유동성을 관리, 추가 또는 제거합니다.'
      ],
      tip: '대시보드를 정기적으로 확인하여 누적된 수수료를 수집합니다.'
    },
    'create-pool': {
      intro: '두 개의 자산과 수수료 티어를 선택하여 새 CLAMM 풀을 시작합니다.',
      steps: [
        'LP 대시보드에서 "풀 만들기"를 클릭합니다.',
        '이름 또는 ID로 검색하여 첫 번째 자산을 선택합니다.',
        '페어의 두 번째 자산을 선택합니다.',
        '적절한 수수료 티어를 선택합니다(0.01%, 0.05%, 0.3% 또는 1%).',
        '풀 생성에 필요한 MBR 비용을 검토합니다.',
        '지갑에서 생성 거래에 서명합니다.'
      ],
      tip: '페어의 예상 변동성에 맞는 수수료 티어를 선택합니다.'
    },
    'add-liquidity-focused': {
      intro: '"집중" 형태로 유동성을 추가하여 최대 자본 효율성을 위해 현재 가격 주변에 자금을 집중합니다.',
      steps: [
        'LP 대시보드에서 풀로 이동하여 "유동성 추가"를 선택합니다.',
        '사용 가능한 형태 목록에서 "집중" 형태를 선택합니다.',
        '시스템이 자동으로 현재 가격 주변의 좁은 범위를 미리 설정합니다.',
        '제공하려는 자산 금액을 입력합니다.',
        '예상 자본 효율성과 예상 수수료를 검토합니다.',
        '유동성을 입금하기 위해 지갑에서 거래에 서명합니다.'
      ],
      tip: '집중 형태는 최고의 자본 효율성을 제공하지만 더 빈번한 모니터링이 필요합니다.'
    },
    'add-liquidity-spread': {
      intro: '"분산" 형태로 더 넓은 가격 범위에 유동성을 추가합니다.',
      steps: [
        '유동성 추가 패널에서 "분산" 형태를 선택합니다.',
        '인터페이스가 사전 구성된 더 넓은 가격 범위를 표시합니다.',
        '필요한 경우 입력 필드를 통해 범위 경계를 조정합니다.',
        '입금할 자산 금액을 입력합니다.',
        '차트에 표시된 유동성 분포를 확인합니다.',
        '입금을 완료하기 위해 거래에 서명합니다.'
      ],
      tip: '분산 형태는 포지션 관리를 덜 원하는 사람들에게 이상적입니다.'
    },
    'add-liquidity-equal': {
      intro: '"균등" 형태로 전체 사용 가능한 가격 범위에 유동성을 추가합니다.',
      steps: [
        '유동성 추가 패널에서 "균등" 형태를 선택합니다.',
        '시스템이 자동으로 전체 사용 가능한 범위로 범위를 설정합니다.',
        '입금할 자산 금액을 입력합니다.',
        '두 자산 간의 비율이 균형 잡혀 있는지 확인합니다.',
        '균등 유동성을 추가하기 위해 거래에 서명합니다.'
      ],
      tip: '균등 형태는 초보자에게 완벽합니다: 전통적인 AMM처럼 작동합니다.'
    },
    'add-liquidity-single': {
      intro: '단일 자산을 사용하여 유동성을 추가합니다. 시스템이 내부적으로 필요한 변환을 관리합니다.',
      steps: [
        '유동성 추가 패널에서 "단일 자산" 형태를 선택합니다.',
        '풀의 두 자산 중 입금하려는 자산을 선택합니다.',
        '선택한 자산의 금액을 입력합니다.',
        '시스템이 LP 포지션의 분배를 자동으로 계산합니다.',
        '포지션에 미치는 영향과 예상 수수료를 검토합니다.',
        '단일 자산 입금을 완료하기 위해 거래에 서명합니다.'
      ],
      tip: '단일 자산 추가는 토큰 중 하나만 있을 때 편리합니다.'
    },
    'add-liquidity-wall': {
      intro: '"벽" 형태로 유동성을 추가하여 모든 자금을 특정 가격 수준에 집중합니다.',
      steps: [
        '유동성 추가 패널에서 "벽" 형태를 선택합니다.',
        '모든 유동성을 집중할 목표 가격을 설정합니다.',
        '입금할 자산 금액을 입력합니다.',
        '선택한 가격 수준이 현실적이고 달성 가능한지 확인합니다.',
        '벽 포지션을 만들기 위해 거래에 서명합니다.'
      ],
      tip: '벽 형태는 지정가 주문처럼 작동합니다: 가격이 지정된 수준에 도달할 때만 유동성이 사용됩니다.'
    },
    'remove-liquidity': {
      intro: 'LP 포지션을 철회하여 누적된 수수료를 포함한 두 자산을 돌려받습니다.',
      steps: [
        'LP 대시보드에서 철회하려는 포지션을 선택합니다.',
        '"유동성 제거"를 클릭합니다.',
        '철회할 비율을 지정합니다(부분 또는 전체 철회를 위한 100%).',
        '받게 될 예상 자산 금액을 검토합니다.',
        '작업을 확인하고 지갑에서 거래에 서명합니다.',
        '자산이 지갑에 입금되었는지 확인합니다.'
      ],
      tip: '비영구적 손실을 피하기 위해 중요한 가격 움직임 전에 유동성을 철회합니다.'
    },
    'manage-liquidity': {
      intro: '기존 LP 포지션을 보고 관리하며 성과를 모니터링하고 조정합니다.',
      steps: [
        'LP 대시보드를 열고 관리할 포지션을 찾습니다.',
        '포지션을 클릭하여 전체 세부 정보를 봅니다.',
        '누적 수수료, 현재 가치 및 가격 범위를 확인합니다.',
        '버튼을 사용하여 유동성을 추가하거나, 제거하거나, 수수료를 수집합니다.',
        '현재 가격이 활성 범위 내에 있는지 모니터링합니다.'
      ],
      tip: '가격이 포지션 경계에 가까워질 때 알림을 받을 수 있도록 가격 알림을 설정합니다.'
    },
    'review-before-sign': {
      intro: '거래에 서명하기 전에 인터페이스와 지갑에 표시된 모든 세부 정보를 주의 깊게 검토합니다.',
      steps: [
        '앱이 표시하는 거래 요약을 주의 깊게 읽습니다.',
        '금액, 자산 및 대상 주소를 확인합니다.',
        '네트워크 수수료와 예상 총 비용을 확인합니다.',
        '지갑을 열고 제안된 거래의 세부 정보를 검토합니다.',
        '모든 세부 정보가 예상과 일치하는 경우에만 서명합니다.',
        '의심스러운 경우 계속하기 전에 취소하고 확인합니다.'
      ],
      tip: '완전히 이해하지 못하거나 예상과 다른 금액을 표시하는 거래에는 절대 서명하지 마십시오.'
    },
    'liquidity-shapes': {
      intro: 'Biatec DEX는 다양한 투자 전략을 위한 5가지 유동성 형태를 제공합니다.',
      steps: [
        '"집중" 형태 학습: 최고 효율성, 빈번한 모니터링 필요.',
        '"분산" 형태 탐색: 효율성과 안정성의 좋은 균형.',
        '"균등" 형태 이해: 가장 단순함, 전체 범위 커버.',
        '"단일 자산" 형태 분석: 단일 토큰으로 입금.',
        '"벽" 형태 학습: 수동적인 지정가 주문으로 특정 가격에 집중된 유동성.',
        '전략과 관리에 투자할 수 있는 시간에 가장 적합한 형태를 선택합니다.'
      ],
      tip: '초보자는 더 고급 전략으로 이동하기 전에 "균등" 형태로 시작해야 합니다.'
    },
    'lp-fee-tiers': {
      intro: 'LP 수수료 티어는 거래자가 풀을 사용하기 위해 얼마나 많은 수수료를 지불하는지 결정합니다.',
      steps: [
        '사용 가능한 네 가지 티어를 이해합니다: 0.01%, 0.05%, 0.3%, 1%.',
        '최소 변동성의 스테이블코인 쌍에는 0.01%를 사용합니다.',
        '확립된 자산과 같이 낮은 변동성 쌍에는 0.05%를 선택합니다.',
        '중간 변동성의 대부분의 표준 쌍에는 0.3%를 선택합니다.',
        '매우 변동성이 높거나 유동성이 낮은 자산에는 1%를 사용합니다.'
      ],
      tip: '0.3% 티어가 가장 많이 사용되며 유동성 유치와 거래량 사이의 최상의 균형을 제공합니다.'
    },
    'price-range': {
      intro: '집중 유동성 포지션에 대한 맞춤형 가격 범위를 설정합니다.',
      steps: [
        '유동성 추가 패널에서 가격 범위 필드를 찾습니다.',
        '"하한" 필드에 최소 가격을 입력합니다.',
        '"상한" 필드에 최대 가격을 입력합니다.',
        '현재 가격이 선택된 범위 내에 있는지 확인합니다.',
        '범위 너비와 예상 자본 효율성을 확인합니다.',
        '전략에 최적의 균형을 찾기 위해 값을 조정합니다.'
      ],
      tip: '더 좁은 범위는 획득한 수수료를 최대화하지만 가격이 범위를 벗어날 위험이 증가합니다.'
    },
    'precision-bins': {
      intro: 'CLAMM 풀의 가격 정밀도 스텝 및 bins을 설정합니다.',
      steps: [
        '풀 생성 시 bin 스텝 설정을 찾습니다.',
        '더 높은 가격 정밀도를 위해 더 작은 스텝 값을 선택합니다.',
        '더 적은 bins으로 더 간단한 관리를 위해 더 큰 값을 선택합니다.',
        '더 작은 bins은 거래의 계산 비용을 증가시킨다는 점을 고려합니다.',
        '확인 전에 bins 분포 미리보기를 검토합니다.'
      ],
      tip: '스테이블코인 쌍에는 매우 작은 bins를 사용하고 변동성 자산에는 관리 비용을 줄이기 위해 더 넓은 bins를 사용합니다.'
    },
    'pool-costs-mbr': {
      intro: 'Algorand에서 풀을 만들고 관리하려면 최소 잔액 요구 사항(MBR)이 필요합니다.',
      steps: [
        '풀을 만들기 전에 MBR 비용 요약을 읽습니다.',
        '필요한 MBR을 충당하기에 충분한 ALGO가 있는지 확인합니다.',
        'MBR은 계약의 복잡성에 따라 달라진다는 것을 이해합니다.',
        '풀이 닫힐 때 MBR이 반환된다는 것을 알아둡니다.',
        'LP 운영의 재정 계획에 MBR 비용을 포함합니다.'
      ],
      tip: 'MBR과 거래 수수료를 충당하기 위해 지갑에 항상 ALGO 버퍼를 유지합니다.'
    },
    'trader-dashboard': {
      intro: '트레이더 대시보드는 개인 거래 통계, 거래 내역 및 시간에 따른 집계 성과를 표시합니다.',
      steps: [
        '지갑을 연결하고 트레이더 대시보드로 이동합니다.',
        '총 거래량과 지불한 수수료를 봅니다.',
        '최근 거래 내역을 스크롤합니다.',
        '자산, 날짜 또는 작업 유형으로 내역을 필터링합니다.',
        '거래 전략을 개선하기 위해 성과를 분석합니다.'
      ],
      tip: '트레이더 대시보드를 사용하여 시간에 따른 성과를 추적합니다.'
    },
    'asset-opt-in': {
      intro: 'Algorand에서는 ASA를 받기 전에 먼저 옵트인해야 합니다.',
      steps: [
        '앱에서 자산 옵트인 섹션으로 이동합니다.',
        '이름으로 자산을 검색하거나 숫자 ID를 입력합니다.',
        '계속하기 전에 자산 세부 정보를 확인합니다.',
        '"옵트인"을 클릭하고 지갑에서 거래에 서명합니다.',
        '자산을 받으려고 시도하기 전에 온체인 확인을 기다립니다.',
        '자산이 지갑에 잔액 0으로 표시되는지 확인합니다.'
      ],
      tip: '검증되고 합법적인 자산에만 옵트인합니다: 각 옵트인은 약 0.1 ALGO를 준비금으로 잠급니다.'
    },
    'copy-address': {
      intro: '클릭 한 번으로 Algorand 주소를 클립보드에 복사하여 쉽게 공유합니다.',
      steps: [
        '지갑이 앱에 연결되어 있는지 확인합니다.',
        '헤더 또는 대시보드에서 축약된 주소를 찾습니다.',
        '주소 옆의 복사 아이콘을 클릭합니다.',
        '주소가 복사되었다는 시각적 확인을 받습니다.',
        '필요한 곳에 주소를 붙여넣습니다.'
      ],
      tip: '자금을 보내기 전에 항상 붙여넣은 주소의 첫 번째와 마지막 문자를 확인합니다.'
    },
    'disconnect-wallet': {
      intro: '작업을 완료한 후 앱에서 지갑 연결을 해제합니다.',
      steps: [
        '헤더에서 주소 또는 지갑 아바타를 클릭합니다.',
        '드롭다운 메뉴에서 "연결 해제" 또는 "로그아웃"을 선택합니다.',
        '필요한 경우 연결 해제를 확인합니다.',
        '인터페이스가 연결되지 않은 상태로 돌아오는지 확인합니다.',
        '공유 장치를 사용하는 경우 추가 보안을 위해 브라우저를 닫습니다.'
      ],
      tip: '공공 컴퓨터나 공유 장치에서 Biatec DEX를 사용할 때는 항상 연결을 해제합니다.'
    },
    'switch-network': {
      intro: '개발, 테스트 또는 실제 거래를 위해 메인넷, 테스트넷 및 로컬넷 간에 전환합니다.',
      steps: [
        '헤더에서 설정 또는 네트워크 선택기를 엽니다.',
        '원하는 네트워크를 선택합니다: 메인넷, 테스트넷 또는 로컬넷.',
        '앱이 새 네트워크 데이터로 다시 로드될 때까지 기다립니다.',
        '지갑이 동일한 네트워크에 구성되어 있는지 확인합니다.',
        '표시된 자산과 풀이 선택한 네트워크와 일치하는지 확인합니다.'
      ],
      tip: '메인넷에서 실제 자금으로 운영하기 전에 항상 테스트넷을 사용하여 새로운 전략을 테스트합니다.'
    },
    'settings-blockchain': {
      intro: 'Algorand 노드 URL, 인덱서 URL 및 API 키를 구성합니다.',
      steps: [
        '애플리케이션 설정으로 이동합니다.',
        '블록체인 설정 섹션을 찾습니다.',
        '해당 필드에 Algorand 노드 URL을 입력합니다.',
        '과거 데이터 조회를 위한 인덱서 URL을 입력합니다.',
        '노드가 인증을 요구하는 경우 API 키를 추가합니다.',
        '설정을 저장하고 연결을 확인합니다.'
      ],
      tip: '더 나은 성능과 신뢰성을 위해 전용 노드 또는 프리미엄 공급자를 사용합니다.'
    },
    'settings-swap': {
      intro: '슬리피지 허용 오차를 포함한 스왑의 기본 설정을 구성합니다.',
      steps: [
        '앱 설정에 액세스하고 스왑 섹션을 선택합니다.',
        '기본 슬리피지 허용 오차를 백분율로 설정합니다.',
        '사용 가능한 다른 스왑 매개변수를 구성합니다.',
        '향후 모든 스왑에 적용하기 위해 변경 사항을 저장합니다.',
        '설정이 올바르게 저장되었는지 확인합니다.'
      ],
      tip: '0.5%-1%의 슬리피지 허용 오차는 대부분의 시장에서 잘 작동합니다.'
    },
    'reset-settings': {
      intro: '모든 설정을 애플리케이션 기본값으로 복원합니다.',
      steps: [
        '애플리케이션 설정으로 이동합니다.',
        '재설정 또는 복원 섹션으로 스크롤합니다.',
        '"기본 설정 복원" 버튼을 클릭합니다.',
        '대화 상자에서 작업을 확인합니다.',
        '앱이 기본 설정으로 다시 로드될 때까지 기다립니다.',
        '필요한 사용자 정의 설정만 수동으로 재구성합니다.'
      ],
      tip: '재설정하기 전에 나중에 쉽게 다시 입력할 수 있도록 사용자 정의 설정을 기록합니다.'
    },
    'tx-validity': {
      intro: 'Algorand 거래의 유효 라운드 수를 설정합니다.',
      steps: [
        '애플리케이션 고급 설정으로 이동합니다.',
        '"거래 유효 라운드" 필드를 찾습니다.',
        '원하는 라운드 수를 입력합니다(일반적으로 기본값 1000).',
        '더 높은 값은 확인에 더 많은 시간을 준다는 것을 고려합니다.',
        '향후 거래에 적용하기 위해 설정을 저장합니다.'
      ],
      tip: '네트워크 혼잡 조건에서는 거래에 더 많은 시간을 주기 위해 유효 라운드를 늘립니다.'
    },
    'localnet-dev': {
      intro: '위험 없이 개발 및 테스트를 위한 로컬 Algorand 네트워크를 실행합니다.',
      steps: [
        '공식 문서에 따라 AlgoKit을 설치합니다.',
        '터미널에서 로컬넷을 시작하는 명령을 실행합니다.',
        '설정에서 Biatec DEX를 로컬넷 네트워크에 연결합니다.',
        '테스트 ALGO가 있는 사전 설정된 테스트 계정을 사용합니다.',
        '기능을 실험하기 위해 테스트 자산과 풀을 만듭니다.',
        '필요한 경우 깨끗한 상태로 시작하기 위해 로컬넷을 재설정합니다.'
      ],
      tip: '로컬넷은 개발자를 위한 이상적인 도구입니다: 실제 비용 없이 스마트 계약을 테스트할 수 있습니다.'
    },
    'about': {
      intro: '"정보" 섹션에는 현재 앱 버전, Biatec 팀 정보 및 공식 리소스 링크가 표시됩니다.',
      steps: [
        '설정 메뉴를 열거나 정보 페이지로 이동합니다.',
        '현재 앱 버전 번호를 봅니다.',
        'Biatec 개발팀에 대한 정보를 읽습니다.',
        '공식 리소스 링크(웹사이트, GitHub, 문서)에 액세스합니다.',
        '지원 및 커뮤니티 채널 링크를 찾습니다.'
      ],
      tip: '최신 기능의 혜택을 받기 위해 정기적으로 앱 버전을 확인하고 업데이트합니다.'
    },
    'documentation': {
      intro: '자세한 가이드, 기술 참조 및 튜토리얼을 위해 Biatec DEX의 공식 문서를 탐색합니다.',
      steps: [
        '메뉴 또는 정보 섹션의 문서 링크를 클릭합니다.',
        '검색 창을 사용하여 특정 주제를 찾습니다.',
        '섹션 간에 이동합니다: 사용자 가이드, 기술 참조, 튜토리얼.',
        '사용하려는 기능에 대한 가이드를 읽습니다.',
        '일반적인 질문에 대한 답변은 FAQ 섹션을 참조합니다.'
      ],
      tip: '기술 참조가 필요할 때 빠른 액세스를 위해 공식 문서를 즐겨찾기에 추가합니다.'
    },
    'security-best-practices': {
      intro: 'Biatec DEX에서 자금을 보호하기 위한 최상의 보안 관행을 따릅니다.',
      steps: [
        '지갑을 연결하기 전에 항상 앱 URL을 확인합니다.',
        '서명하기 전에 모든 거래를 주의 깊게 검토합니다.',
        '시드 구문이나 개인 키를 절대 누구와도 공유하지 마십시오.',
        '많은 양의 유동성에 대해 멀티시그 사용을 고려합니다.',
        '하드웨어 지갑 펌웨어를 최신 버전으로 업데이트합니다.',
        '작업에 보안 연결(HTTPS)과 신뢰할 수 있는 네트워크를 사용합니다.'
      ],
      tip: 'Ledger와 같은 하드웨어 지갑은 상당한 금액에 대한 최고 수준의 보안을 제공합니다.'
    },
    'help-center': {
      intro: 'Biatec DEX 도움말 센터는 플랫폼의 모든 기능을 다루는 검색 가능한 가이드입니다.',
      steps: [
        '메인 메뉴 또는 헤더에서 도움말 센터를 엽니다.',
        '검색 창을 사용하여 키워드로 가이드를 찾습니다.',
        '카테고리를 탐색하여 관련 주제를 탐색합니다.',
        '가이드를 클릭하여 자세한 단계별 지침을 읽습니다.',
        '각 가이드 하단의 팁을 사용하여 고급 조언을 얻습니다.'
      ],
      tip: '도움말 센터에서 답변을 찾을 수 없는 경우 공식 커뮤니티 채널을 통해 Biatec 팀에 문의합니다.'
    }
  }
}