import "./styles.css";

export default function App() {
  function Submit(e) {
    const formatDate = (d) => {
      const day = d.getDate();
      const suffix = (day % 10 === 1 && day !== 11)
        ? "st"
        : (day % 10 === 2 && day !== 12)
        ? "nd"
        : (day % 10 === 3 && day !== 13)
        ? "rd"
        : "th";
      const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return d.toLocaleString("en-US", { month: "long" }) + ` ${day}${suffix}, ${d.getFullYear()} (${time})`;
    };
    e.preventDefault();
    const formEle = document.querySelector("form");
    const formDatab = new FormData(formEle);
    formDatab.append("Timestamp", formatDate(new Date()));
    fetch(
      "https://script.google.com/macros/s/AKfycbxrfr0uxC91FJxYk-6P43sEF-M1TRpFTnpTnFq5fa20synMBrP3mlh4T9Xx5eO1HXVJqQ/exec",
      {
        method: "POST",
        body: formDatab,
      }
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.log(error);
      });
  }
  return (
    <div className="App">
      <h1>Contact Me form</h1>
      <h2>
        This demonstrates how to send data from a website form to Google sheet
        in React or Vanilla jS
      </h2>
      <div>
        <form className="form" onSubmit={(e) => Submit(e)}>
          <input placeholder="Your Name" name="Member" type="text" />
          <input placeholder="Items you are bringing" name="Items" type="text" />
          <select name="Location">
            <option value="My House">My House</option>
            <option value="School">School</option>
          </select>
          <input placeholder="Amount" name="Quantity" type="text" />
          <input placeholder="Any items not in the checklist, record here!" name="Other" type="text" />
          <input name="button" type="submit" />
        </form>
      </div>
    </div>
  );
}
