import "./styles.css";

import { useState, useEffect } from "react";

export default function App() {
  const [itemsList, setItemsList] = useState([]);

  // Fetch Parts list from Google Sheet CSV on mount
  useEffect(() => {
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRp1ofRPSUy_hqqM91nqjBTXto3wnm4QdpTO-WHTuGHOtnu588M_WlUUzLAR-aLMAidaS1ltP2HgzWn/pub?gid=1483661551&single=true&output=csv";
    fetch(csvUrl)
      .then((res) => res.text())
      .then((text) => {
        const lines = text.trim().split(/\r?\n/);
        const names = lines.slice(1) // skip header
          .map((row) => row.split(",")[0].replace(/\"/g, '').trim())
          .filter((s) => s);
        setItemsList(names);
      })
      .catch((err) => console.error("Failed to load items list", err));
  }, []);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // {item: qty}

  const filteredItems = itemsList.filter((it) => it.toLowerCase().includes(search.toLowerCase()));

  function toggleItem(item) {
    setSelected((prev) => {
      const copy = { ...prev };
      if (Object.prototype.hasOwnProperty.call(copy, item)) {
        delete copy[item];
      } else {
        copy[item] = ""; // empty quantity initially
      }
      return copy;
    });
  }

  function changeQty(item, val) {
    setSelected((prev) => ({ ...prev, [item]: val }));
  }

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
    // Build items and quantities strings preserving order
    const selectedItems = Object.keys(selected);
    const quantitiesArr = selectedItems.map((it) => selected[it] || "0");

    formDatab.delete("Items");
    formDatab.append("Items", selectedItems.join(", "));
    formDatab.append("Quantity", quantitiesArr.join(", "));
    formDatab.append("Timestamp", formatDate(new Date()));
    fetch(
      "https://script.google.com/macros/s/AKfycbwMZ7VdHjVG_49jRoFC_zcw-h578KW6agzAIrizvtEvKuMJUQu5s-T1Gcc13SvGISwfKw/exec",
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
      <header className="hero">
        <h1>FTC Inventory</h1>
      </header>
      <main className="main">
        <section className="form-card">
          <form className="form" onSubmit={(e) => Submit(e)}>
            {/* Section 1: name + location */}
            <div className="form-section">
              <label>Name:</label>
              <input placeholder="Your Name" name="Member" type="text" />
              <label>From:</label>
              <select name="From">
              <option value="School">School</option>
                <option value="Mohnish's House">Mohnish's House</option>
                <option value="Akshita's House">Akshita's House</option>
                <option value="Mohana's House">Mohana's House</option>
                <option value="Diya's House">Diya's House</option>
                <option value="Niranjan's House">Niranjan's House</option>
                <option value="Millan's House">Millan's House</option>
                <option value="Bryan's House">Bryan's House</option>
                <option value="Joseph's House">Joseph's House</option>
                <option value="Jonathan's House">Jonathan's House</option>
                <option value="Christopher's House">Christopher's House</option>
              </select>
              <label>To:</label>
              <select name="To">
                <option value="School">School</option>
                <option value="Mohnish's House">Mohnish's House</option>
                <option value="Akshita's House">Akshita's House</option>
                <option value="Mohana's House">Mohana's House</option>
                <option value="Diya's House">Diya's House</option>
                <option value="Niranjan's House">Niranjan's House</option>
                <option value="Millan's House">Millan's House</option>
                <option value="Bryan's House">Bryan's House</option>
                <option value="Joseph's House">Joseph's House</option>
                <option value="Jonathan's House">Jonathan's House</option>
                <option value="Christopher's House">Christopher's House</option>
              </select>
            </div>

            {/* Section 2: checklist + quantity */}
            <div className="form-section">
              <label>Select all Items you have:</label>
              <input
                type="text"
                className="search-input"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="checklist">
                {filteredItems.map((item) => (
                  <div className="item-row" key={item}>
                    <label className="chk-label">
                      <input
                        type="checkbox"
                        checked={selected[item] !== undefined}
                        onChange={() => toggleItem(item)}
                      /> {item}
                    </label>
                    {selected[item] !== undefined && (
                      <input
                        type="number"
                        className="qty-input"
                        placeholder="Qty"
                        value={selected[item]}
                        onChange={(e) => changeQty(item, e.target.value)}
                        min="0"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: other */}
            <div className="form-section">
              <label>Please enter anything not in the above list:</label>
              <input placeholder="Any items not in the checklist, record here!" name="Other" type="text" />
            </div>

            <input name="button" type="submit" />
          </form>
        </section>
      </main>
    </div>
  );
}
