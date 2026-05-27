/* ================================================================
   SCRIPT.JS — Portfolio Alex Moreau
   Thème : Automobile de Performance

   SOMMAIRE :
   01. Splash Screen : Animation du tachymètre
   02. Curseur F1 : Suivi souris + orientation + traces de pneus
   03. Navigation : Scroll spy, hamburger menu, header sticky
   04. Indicateur de vitesse de scroll (décoration nav)
   05. Jauges de compétences : Animation au scroll (IntersectionObserver)
   06. Animations générales au scroll (IntersectionObserver)
   07. Formulaire de contact : Validation + feedback

   NOTE DE LECTURE :
   Chaque section est longuement commentée pour que le code soit
   compréhensible même par un développeur débutant. Bonne lecture !
================================================================ */


/* ================================================================
   01. SPLASH SCREEN — ANIMATION DU TACHYMÈTRE
   
   Principe :
   - Au chargement de la page, un overlay noir masque le contenu.
   - On anime l'aiguille du tachymètre de 0 à 8000 tr/min.
   - L'arc de progression SVG est rempli en parallèle.
   - Quand on atteint la "zone rouge" (6500+), on déclenche une vibration.
   - On masque ensuite l'overlay avec un fondu.
================================================================ */

/**
 * Ferme le splash screen même si une erreur a interrompu l'animation.
 */
function forceCloseSplashScreen() {
  const splashScreen = document.getElementById('splash-screen');
  if (!splashScreen) return;
  if (splashScreen.dataset.closed === 'true') return;

  splashScreen.dataset.closed = 'true';
  splashScreen.classList.add('hidden');

  // Fallback: si la transition CSS ne remonte pas d'événement.
  setTimeout(function() {
    splashScreen.style.display = 'none';
  }, 900);
}

/**
 * Gère toute la séquence d'animation du splash screen.
 * Cette fonction est appelée une seule fois, au chargement de la page.
 */
function initSplashScreen() {

  // --- Récupération des éléments HTML ---
  const splashScreen  = document.getElementById('splash-screen');
  const needle        = document.getElementById('tacho-needle');
  const arcFill       = document.getElementById('tacho-arc');
  const rpmDisplay    = document.getElementById('rpm-display');
  const splashStatus  = document.getElementById('splash-status');
  const tachoWrapper  = document.querySelector('.tacho-wrapper');

  // Sécurité : si des éléments clés manquent, on débloque l'UI.
  if (!splashScreen || !needle || !arcFill || !rpmDisplay) {
    forceCloseSplashScreen();
    return;
  }

  // Filet de sécurité : fermeture forcée après 5.5s quoi qu'il arrive.
  const splashFailsafeTimer = setTimeout(function() {
    forceCloseSplashScreen();
  }, 5500);

  // --- Paramètres du tachymètre ---
  const RPM_MAX       = 8000;  // Tr/min maximum affiché
  const RPM_REDZONE   = 6500;  // Tr/min à partir duquel on entre en "zone rouge"
  const ANIM_DURATION = 3000;  // Durée totale de l'animation en millisecondes

  // L'aiguille tourne de -90° (gauche = 0 rpm) à +90° (droite = max rpm)
  // Soit un arc de 180°.
  const ANGLE_MIN = -90;
  const ANGLE_MAX = 90;

  // L'arc SVG a une longueur totale de ~377px (circumference d'un rayon 60).
  // stroke-dashoffset contrôle quelle portion de l'arc est dessinée.
  // - 377 = arc complètement masqué
  // - 0   = arc complètement visible
  const ARC_TOTAL_LENGTH = 377;

  // Variable de suivi : a-t-on déjà déclenché la vibration ?
  let vibrationTriggered = false;

  // --- Animation principale ---
  // On utilise requestAnimationFrame pour une animation fluide (60fps)
  // startTime sera défini au premier appel
  let startTime = null;

  /**
   * Fonction d'animation exécutée à chaque frame.
   * @param {number} timestamp - Timestamp fourni par requestAnimationFrame
   */
  function animateNeedle(timestamp) {

    // Initialisation du temps de départ à la première frame
    if (!startTime) startTime = timestamp;

    // Calcul de la progression : valeur entre 0 et 1
    const elapsed  = timestamp - startTime;
    const rawProgress = elapsed / ANIM_DURATION; // Progression linéaire

    // Easing "ease-out" : accélère au début, ralentit à la fin
    // Formule classique : t * (2 - t)
    // Cela simule l'inertie d'un moteur qui monte en régime
    const easedProgress = rawProgress * (2 - rawProgress);

    // On s'assure de ne jamais dépasser 1 (100%)
    const progress = Math.min(easedProgress, 1);

    // Calcul du RPM actuel en fonction de la progression
    const currentRPM = Math.round(progress * RPM_MAX);

    // --- Mise à jour de l'aiguille ---
    // On interpole l'angle entre ANGLE_MIN et ANGLE_MAX
    const currentAngle = ANGLE_MIN + (progress * (ANGLE_MAX - ANGLE_MIN));
    // Le point de rotation est le centre bas du tachymètre (cx=150, cy=175 en SVG)
    needle.setAttribute('transform', `rotate(${currentAngle}, 150, 175)`);

    // --- Mise à jour de l'arc SVG ---
    // Plus la progression est grande, moins le dashoffset est grand (= plus de rouge visible)
    const dashOffset = ARC_TOTAL_LENGTH * (1 - progress);
    arcFill.style.strokeDashoffset = dashOffset;

    // --- Mise à jour de l'affichage numérique des RPM ---
    // padStart(4, '0') ajoute des zéros devant pour toujours afficher 4 chiffres : "0042", "7824"
    rpmDisplay.textContent = String(currentRPM).padStart(4, '0');

    // --- Détection de la zone rouge ---
    if (currentRPM >= RPM_REDZONE && !vibrationTriggered) {
      vibrationTriggered = true;

      // On change la couleur de l'arc en bleu vif
      arcFill.style.stroke = '#4a90e2';

      // On déclenche la vibration CSS
      if (tachoWrapper) tachoWrapper.classList.add('vibrating');

      // On met à jour le texte de statut
      if (splashStatus) {
        splashStatus.textContent = 'Zone bleue atteinte !';
        splashStatus.style.color = '#4a90e2';
      }
    }

    // --- Continuation ou fin de l'animation ---
    if (progress < 1) {
      // L'animation n'est pas terminée : on demande la prochaine frame
      requestAnimationFrame(animateNeedle);

    } else {
      // L'animation est terminée !
      rpmDisplay.textContent = '8000'; // Valeur finale exacte

      // On laisse le tachymètre vibrer encore 600ms pour l'effet dramatique
      setTimeout(function() {

        // Arrêt de la vibration
        if (tachoWrapper) tachoWrapper.classList.remove('vibrating');

        // Message final
        if (splashStatus) splashStatus.textContent = 'Système prêt. Bonne visite !';

        // Après 400ms supplémentaires, on cache le splash screen avec un fondu
        setTimeout(function() {
          clearTimeout(splashFailsafeTimer);
          // La classe 'hidden' déclenche le fondu via CSS (opacity: 0)
          forceCloseSplashScreen();

          // Après la transition CSS, on supprime complètement l'élément du DOM
          // pour libérer les ressources (le 'display: none' via visibility: hidden suffit,
          // mais on peut aller plus loin)
          splashScreen.addEventListener('transitionend', function() {
            splashScreen.style.display = 'none';
          }, { once: true }); // { once: true } = le listener se supprime après le premier appel

          // On lance les autres animations du site
          initSkillGauges();

        }, 400);

      }, 600);
    }
  }

  // Lancement de la première frame d'animation
  requestAnimationFrame(animateNeedle);
}


/* ================================================================
   02. CURSEUR F1 — SUIVI SOURIS + ORIENTATION + TRACES DE PNEUS
   
   Principe :
   - On récupère la position de la souris en temps réel (mousemove).
   - On déplace le div #cursor-f1 à cette position.
   - On calcule l'angle de déplacement avec Math.atan2 (trigonométrie).
   - On applique une rotation CSS pour orienter l'emoji dans la bonne direction.
   - On génère des petites divs "traces de pneus" qui disparaissent en fondu.
   
   Note : Cet effet est désactivé sur mobile (pas de souris).
================================================================ */

/**
 * Initialise le curseur F1 personnalisé.
 * Vérifie d'abord que l'utilisateur est sur desktop (pas de touch).
 */
function initCustomCursor() {

  // --- Détection mobile : on désactive sur les écrans tactiles ---
  // window.matchMedia teste si une media query CSS est vraie
  // 'pointer: coarse' = écran tactile (doigt imprécis)
  // 'pointer: fine'   = souris ou trackpad précis
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  if (isTouchDevice) {
    // Sur mobile : on ne fait rien, le curseur natif reste visible
    return;
  }

  // --- Récupération de l'élément curseur ---
  const cursorEl = document.getElementById('cursor-f1');
  if (!cursorEl) return;

  // On active le curseur F1 et on masque le curseur natif
  cursorEl.style.display = 'block';
  document.body.classList.add('custom-cursor-active');

  // --- Variables de suivi ---
  // On mémorise la position précédente pour calculer la direction
  let prevX = 0;
  let prevY = 0;
  let currentX = 0;
  let currentY = 0;

  // Compteur pour limiter la fréquence de création des traces de pneus
  // (on ne crée pas une trace à CHAQUE pixel, sinon c'est trop lourd)
  let traceCounter = 0;
  const TRACE_FREQUENCY = 3; // Une trace tous les N mouvements de souris

  // --- Écouteur principal de mouvement souris ---
  document.addEventListener('mousemove', function(event) {

    // Mémorisation de la position précédente
    prevX = currentX;
    prevY = currentY;

    // Mise à jour de la position actuelle
    currentX = event.clientX;
    currentY = event.clientY;

    // Déplacement de l'élément curseur avec CSS 'left' et 'top'
    // Note : le curseur est en 'position: fixed', donc relatif à la fenêtre
    cursorEl.style.left = currentX + 'px';
    cursorEl.style.top  = currentY + 'px';

    // --- Calcul de l'angle de rotation ---
    // Math.atan2(dy, dx) retourne l'angle en radians entre
    // l'axe horizontal et le vecteur (dx, dy).
    const dx = currentX - prevX; // Différence horizontale
    const dy = currentY - prevY; // Différence verticale (positif = vers le bas)

    // On vérifie qu'il y a eu un déplacement réel (pas simplement un minuscule tremblement)
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {

      // Conversion de radians en degrés
      // atan2 renvoie un angle entre -π et +π (soit -180° et +180°)
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);

      // On applique la rotation à l'emoji
      // +90° de correction car l'emoji 🏎️ pointe vers la droite par défaut,
      // et on veut qu'il pointe vers le haut pour suivre la direction de mouvement.
      cursorEl.style.transform = `rotate(${angleDeg + 90}deg)`;

      // --- Création des traces de pneus ---
      traceCounter++;
      if (traceCounter >= TRACE_FREQUENCY) {
        traceCounter = 0; // Réinitialisation du compteur
        createTireTrace(currentX, currentY);
      }
    }
  });

  // --- Masquage du curseur quand la souris quitte la fenêtre ---
  document.addEventListener('mouseleave', function() {
    cursorEl.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function() {
    cursorEl.style.opacity = '1';
  });
}

/**
 * Crée une "trace de pneu" à la position donnée.
 * La trace est un petit div circulaire qui disparaît progressivement.
 *
 * @param {number} x - Position horizontale en pixels
 * @param {number} y - Position verticale en pixels
 */
function createTireTrace(x, y) {

  // Création d'un nouveau div
  const trace = document.createElement('div');
  trace.classList.add('tire-trace');

  // Positionnement à la position actuelle de la souris
  // On soustrait la moitié de la taille (6px / 2 = 3px) pour centrer
  trace.style.left = (x - 3) + 'px';
  trace.style.top  = (y - 3) + 'px';

  // Variation aléatoire de la taille pour plus de réalisme
  const size = Math.random() * 4 + 4; // Entre 4px et 8px
  trace.style.width  = size + 'px';
  trace.style.height = size + 'px';

  // Léger décalage aléatoire de la position (pour simuler les deux pneus)
  trace.style.left = (x + (Math.random() * 8 - 4)) + 'px';
  trace.style.top  = (y + (Math.random() * 8 - 4)) + 'px';

  // Ajout au DOM (on l'insère directement dans body)
  document.body.appendChild(trace);

  // --- Suppression après 1 seconde ---
  // L'animation CSS fade-out dure 1 seconde, et on supprime l'élément ensuite.
  // Utiliser setTimeout permet d'éviter une accumulation infinie de divs dans le DOM.
  setTimeout(function() {
    // Vérification que l'élément est toujours dans le DOM avant de le supprimer
    if (trace.parentNode) {
      trace.parentNode.removeChild(trace);
    }
  }, 1000); // 1000ms = 1 seconde
}


/* ================================================================
   03. NAVIGATION — SCROLL SPY, HAMBURGER MENU, HEADER STICKY
================================================================ */

/**
 * Gère tous les comportements de la navigation :
 * - Ajout de la classe 'scrolled' sur le header quand on scroll
 * - Surlignage du lien de nav correspondant à la section visible (scroll spy)
 * - Ouverture/fermeture du menu hamburger sur mobile
 */
function initNavigation() {

  const header    = document.getElementById('main-header');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks  = document.querySelector('.nav-links');
  const allLinks  = document.querySelectorAll('.nav-link');
  const sections  = document.querySelectorAll('section[id]');

  if (!header) return;

  // --- Comportement au scroll ---
  window.addEventListener('scroll', function() {
    const scrollY = window.scrollY;

    // Ajoute/retire une classe CSS quand on a scrollé de plus de 50px
    // (pour changer l'apparence du header)
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Scroll Spy : détermine quelle section est actuellement visible
    updateActiveLink(scrollY, sections, allLinks);
  });

  // --- Menu hamburger (mobile) ---
  if (navToggle && navLinks) {

    navToggle.addEventListener('click', function() {
      // Basculement de l'état ouvert/fermé
      const isOpen = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);

      // Mise à jour de l'attribut ARIA pour l'accessibilité
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Fermeture du menu quand on clique sur un lien
    allLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/**
 * Met à jour le lien actif dans la navigation en fonction de la position de scroll.
 * 
 * @param {number} scrollY       - Position verticale du scroll actuel
 * @param {NodeList} sections    - Toutes les sections de la page
 * @param {NodeList} navLinks    - Tous les liens de navigation
 */
function updateActiveLink(scrollY, sections, navLinks) {

  // On parcourt toutes les sections pour trouver celle qui est visible
  sections.forEach(function(section) {

    // offsetTop = distance entre le haut de la section et le haut de la page
    // offsetHeight = hauteur de la section
    const sectionTop    = section.offsetTop - 120; // -120 pour le header sticky
    const sectionBottom = sectionTop + section.offsetHeight;
    const sectionId     = section.getAttribute('id');

    // Si le scroll est dans la plage de cette section...
    if (scrollY >= sectionTop && scrollY < sectionBottom) {

      // On retire 'active' de tous les liens
      navLinks.forEach(function(link) {
        link.classList.remove('active');
      });

      // On ajoute 'active' au lien correspondant à cette section
      // querySelector cherche le lien dont href se termine par #sectionId
      const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }
  });
}


/* ================================================================
   04. INDICATEUR DE VITESSE DE SCROLL (DÉCORATION NAVIGATION)
   
   Principe amusant : on mesure la vitesse de scroll en pixels/seconde
   et on l'affiche dans la navigation comme un compteur de vitesse.
================================================================ */

/**
 * Met à jour l'indicateur de vitesse de scroll dans la navigation.
 * Purement décoratif, dans le thème automobile.
 */
function initScrollSpeedometer() {

  const speedDisplay = document.getElementById('scroll-speed');
  if (!speedDisplay) return;

  let lastScrollY   = window.scrollY;
  let lastTimestamp = Date.now();

  window.addEventListener('scroll', function() {
    const currentScrollY   = window.scrollY;
    const currentTimestamp = Date.now();

    // Calcul de la vitesse : pixels déplacés / temps écoulé (en secondes)
    const deltaY    = Math.abs(currentScrollY - lastScrollY);
    const deltaTime = (currentTimestamp - lastTimestamp) / 1000; // Conversion ms → secondes

    // Évite la division par zéro
    if (deltaTime > 0) {
      const speed = Math.round(deltaY / deltaTime); // pixels par seconde

      // On limite l'affichage à 999 pour que ça tienne en 3 chiffres
      const displaySpeed = Math.min(speed, 999);

      // padStart(3, '0') : toujours 3 chiffres — "042", "999"
      speedDisplay.textContent = String(displaySpeed).padStart(3, '0');

      // La valeur diminue progressivement après un scroll (simuler un ralentissement)
      clearTimeout(speedDisplay._decayTimer);
      speedDisplay._decayTimer = setTimeout(function() {
        speedDisplay.textContent = '000';
      }, 300);
    }

    // Mémorisation pour le prochain calcul
    lastScrollY   = currentScrollY;
    lastTimestamp = currentTimestamp;
  });
}


/* ================================================================
   05. JAUGES DE COMPÉTENCES — ANIMATION AU SCROLL
   
   Principe :
   - Les jauges SVG ont leur arc initialement à 0% (dashoffset = 201).
   - Quand la section entre dans le viewport, on anime chaque jauge
     jusqu'à son pourcentage cible (défini dans data-percent).
   - On utilise l'IntersectionObserver, plus efficace que scroll + getBoundingClientRect().
================================================================ */

/**
 * Initialise les jauges circulaires de compétences.
 * Cette fonction est appelée APRÈS la fin du splash screen.
 */
function initSkillGauges() {

  // Récupération de toutes les jauges
  const gauges = document.querySelectorAll('.skill-gauge');
  if (gauges.length === 0) return;

  /**
   * IntersectionObserver : observe les éléments et déclenche une action
   * quand ils entrent/sortent du viewport.
   * 
   * @param {IntersectionObserverEntry[]} entries - Liste des éléments observés
   */
  const observer = new IntersectionObserver(function(entries) {

    entries.forEach(function(entry) {
      // entry.isIntersecting = true quand l'élément est visible dans le viewport
      if (entry.isIntersecting) {

        const gauge = entry.target;

        // Lecture du pourcentage depuis l'attribut HTML data-percent
        const targetPercent = parseInt(gauge.dataset.percent, 10) || 0;

        // Récupération des éléments enfants de la jauge
        const circleFill    = gauge.querySelector('.gauge-fill');
        const percentDisplay = gauge.querySelector('.gauge-percent');

        if (circleFill && percentDisplay) {
          animateGauge(circleFill, percentDisplay, targetPercent);
        }

        // On arrête d'observer cet élément (l'animation ne se joue qu'une fois)
        observer.unobserve(gauge);
      }
    });

  }, {
    threshold: 0.3 // L'animation démarre quand 30% de l'élément est visible
  });

  // On commence à observer chaque jauge
  gauges.forEach(function(gauge) {
    observer.observe(gauge);
  });
}

/**
 * Anime une jauge circulaire de 0% jusqu'à la valeur cible.
 * 
 * @param {SVGCircleElement} circle       - Le cercle SVG à animer
 * @param {HTMLElement} display           - L'élément qui affiche le % en texte
 * @param {number} targetPercent          - Le pourcentage cible (0-100)
 */
function animateGauge(circle, display, targetPercent) {

  // Longueur totale de la circumférence du cercle SVG
  // Formule : 2 * π * rayon = 2 * 3.14159 * 32 ≈ 201
  const CIRCUMFERENCE = 201;

  // La valeur de dashoffset qui correspond à 0%
  // (100% masqué = dashoffset égal à la longueur totale)
  const START_OFFSET = CIRCUMFERENCE;

  // La valeur de dashoffset qui correspond au pourcentage cible
  // Exemple : 85% → dashoffset = 201 * (1 - 0.85) = 201 * 0.15 ≈ 30
  const TARGET_OFFSET = CIRCUMFERENCE * (1 - targetPercent / 100);

  // Durée de l'animation en millisecondes
  const DURATION = 1500;

  let startTime = null;

  /**
   * Fonction d'animation exécutée à chaque frame.
   */
  function animateFrame(timestamp) {

    if (!startTime) startTime = timestamp;

    const elapsed  = timestamp - startTime;
    const rawProgress = elapsed / DURATION;

    // Easing "ease-out-cubic" pour un effet plus dynamique
    // t^3 : accélération forte au début, décélération progressive
    const t = Math.min(rawProgress, 1);
    const easedProgress = 1 - Math.pow(1 - t, 3);

    // Calcul du dashoffset actuel (interpolation entre START et TARGET)
    const currentOffset = START_OFFSET + (TARGET_OFFSET - START_OFFSET) * easedProgress;

    // Application au cercle SVG
    circle.style.strokeDashoffset = currentOffset;

    // Calcul et affichage du pourcentage textuel
    const currentPercent = Math.round(targetPercent * easedProgress);
    display.textContent = currentPercent + '%';

    // Continuation si pas encore terminé
    if (t < 1) {
      requestAnimationFrame(animateFrame);
    } else {
      // Valeur finale exacte (pour éviter les approximations d'arrondi)
      circle.style.strokeDashoffset = TARGET_OFFSET;
      display.textContent = targetPercent + '%';
    }
  }

  // Lancement de l'animation
  requestAnimationFrame(animateFrame);
}


/* ================================================================
   06. ANIMATIONS D'APPARITION AU SCROLL
   
   Principe :
   - On sélectionne des éléments avec la classe 'pre-animate'.
   - Au scroll, quand ils entrent dans le viewport, on leur ajoute
     la classe 'animate-in' qui déclenche l'animation CSS fade-in-up.
================================================================ */

/**
 * Initialise les animations d'apparition pour les éléments au scroll.
 */
function initScrollAnimations() {

  // Sélection de tous les éléments à animer au scroll
  // On utilise querySelectorAll pour obtenir une NodeList
  const animatableElements = document.querySelectorAll(
    '.project-card, .about-grid, .contact-grid, .section-header, .skill-gauge'
  );

  // Ajout de la classe de pré-animation (rend les éléments invisibles au départ)
  animatableElements.forEach(function(el) {
    el.classList.add('pre-animate');
  });

  // Création de l'observer
  const observer = new IntersectionObserver(function(entries) {

    entries.forEach(function(entry, index) {
      if (entry.isIntersecting) {

        const el = entry.target;

        // Délai en cascade pour les éléments dans une grille (effet de vague)
        // On récupère l'index de l'élément parmi ses frères
        const siblings = Array.from(el.parentNode.children);
        const elementIndex = siblings.indexOf(el);

        // Délai : chaque élément apparaît 100ms après le précédent
        const delay = elementIndex * 100;

        setTimeout(function() {
          el.classList.remove('pre-animate');
          el.classList.add('animate-in');
        }, delay);

        // On arrête d'observer (l'animation ne se joue qu'une fois)
        observer.unobserve(el);
      }
    });

  }, {
    threshold: 0.1,    // Déclenche quand 10% de l'élément est visible
    rootMargin: '0px 0px -50px 0px' // Déclenche un peu avant d'atteindre le bas du viewport
  });

  // On commence à observer chaque élément
  animatableElements.forEach(function(el) {
    observer.observe(el);
  });
}


/* ================================================================
   07. FORMULAIRE DE CONTACT — VALIDATION + FEEDBACK
   
   Principe :
   - On intercepte la soumission du formulaire (preventDefault).
   - On valide que les champs ne sont pas vides.
   - On simule un envoi (dans un vrai projet, on ferait un fetch/XMLHttpRequest).
   - On affiche un message de confirmation à l'utilisateur.
================================================================ */

/**
 * Initialise la gestion du formulaire de contact.
 */
function initContactForm() {

  const form         = document.getElementById('contact-form');
  const submitBtn    = document.getElementById('submit-btn');
  const confirmation = document.getElementById('form-confirmation');

  if (!form) return;

  // Interception de la soumission du formulaire
  form.addEventListener('submit', function(event) {

    // Empêche le comportement par défaut (rechargement de la page)
    event.preventDefault();

    // --- Validation des champs ---
    const nameInput    = document.getElementById('contact-name');
    const emailInput   = document.getElementById('contact-email');
    const messageInput = document.getElementById('contact-message');

    // Récupération des valeurs (trim() supprime les espaces en début/fin)
    const name    = nameInput.value.trim();
    const email   = emailInput.value.trim();
    const message = messageInput.value.trim();

    // Vérification que les champs ne sont pas vides
    if (!name || !email || !message) {
      // Mise en évidence des champs invalides
      if (!name)    highlightInvalidField(nameInput);
      if (!email)   highlightInvalidField(emailInput);
      if (!message) highlightInvalidField(messageInput);
      return; // On arrête si les champs sont invalides
    }

    // Vérification du format email avec une expression régulière simple
    // Cette regex vérifie qu'il y a : quelquechose @ quelquechose . quelquechose
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      highlightInvalidField(emailInput);
      return;
    }

    // --- Simulation d'envoi ---
    // On désactive le bouton pour éviter les doubles envois
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Envoi en cours...</span>';

    // On simule un délai réseau avec setTimeout
    // Dans un vrai projet, on ferait : fetch('/api/contact', { method: 'POST', body: ... })
    setTimeout(function() {

      // --- Affichage de la confirmation ---
      // On retire l'attribut 'hidden' pour rendre l'élément visible
      confirmation.removeAttribute('hidden');

      // On cache le bouton d'envoi
      submitBtn.style.display = 'none';

      // On réinitialise le formulaire
      form.reset();

      // Scroll vers le message de confirmation pour que l'utilisateur le voie
      confirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    }, 1500); // Délai simulé de 1.5 seconde
  });
}

/**
 * Met en évidence un champ invalide avec une bordure rouge et une animation.
 * 
 * @param {HTMLInputElement|HTMLTextAreaElement} field - Le champ à mettre en évidence
 */
function highlightInvalidField(field) {
  field.style.borderColor = '#4a90e2';
  field.style.boxShadow   = '0 0 0 3px rgba(74, 144, 226, 0.2)';

  // Animation de "secousse" pour indiquer l'erreur
  field.style.animation = 'none';

  // On réinitialise le style après 2 secondes
  setTimeout(function() {
    field.style.borderColor = '';
    field.style.boxShadow   = '';
  }, 2000);

  // On place le focus sur le premier champ invalide
  field.focus();
}


/* ================================================================
   08. INITIALISATION — POINT D'ENTRÉE DU SCRIPT
   
   DOMContentLoaded : événement déclenché quand le HTML est chargé et parsé,
   AVANT que les images et autres ressources soient chargées.
   C'est le bon moment pour initialiser le JS qui manipule le DOM.
================================================================ */

document.addEventListener('DOMContentLoaded', function() {

  /**
   * ORDRE D'INITIALISATION :
   * 1. Splash screen en premier (bloque le contenu, doit démarrer immédiatement)
   * 2. Curseur F1 (indépendant du reste)
   * 3. Navigation (essentielle pour la navigation)
   * 4. Speedomètre de scroll (décoratif)
   * 5. Animations scroll (pour les entrées visuelles)
   * 6. Formulaire (interactivité)
   * 
   * NOTE : initSkillGauges() est appelée à la FIN du splash screen
   * (dans initSplashScreen) pour s'assurer que les jauges ne s'animent
   * pas pendant que l'overlay les masque.
   */

  initSplashScreen();       // 01 — Splash screen et tachymètre
  initCustomCursor();       // 02 — Curseur F1 personnalisé
  initNavigation();         // 03 — Comportements de navigation
  initScrollSpeedometer();  // 04 — Compteur de vitesse de scroll
  initScrollAnimations();   // 05 — Animations d'apparition au scroll
  initContactForm();        // 06 — Formulaire de contact

  // Ultime secours : garantit que l'interface n'est jamais bloquée.
  setTimeout(function() {
    forceCloseSplashScreen();
  }, 7000);

  // Log de débogage (visible dans la console du navigateur avec F12)
  console.log('%c🏎️  Portfolio Alex Moreau — Moteur démarré !', 'color: #cc0000; font-size: 14px; font-weight: bold;');
  console.log('%cDark mode · Sport automobile · JS Vanilla ES6', 'color: #888; font-size: 11px;');
});