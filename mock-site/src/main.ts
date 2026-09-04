import "@fontsource/inter/latin-300.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "./styles.css";

document.documentElement.classList.add("js-ready");

const header = document.querySelector<HTMLElement>("[data-header]");
const reservationForm = document.querySelector<HTMLFormElement>("[data-reservation-form]");
const confirmation = document.querySelector<HTMLElement>("[data-confirmation]");
const revealElements = document.querySelectorAll<HTMLElement>(".reveal");

const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  },
  { rootMargin: "0px 0px -8%", threshold: 0.08 },
);

for (const element of revealElements) {
  revealObserver.observe(element);
}

reservationForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!reservationForm.reportValidity()) return;
  if (!confirmation) throw new Error("Reservation confirmation status element was not found.");

  confirmation.hidden = false;
});
