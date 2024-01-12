import React, { useState, useEffect } from "react";

export default function Try() {
    const [count, setCount] = useState(0);
    function handleAlertClick() {
        alert('You clicked on: ' + count);
    }
    useEffect(() => {
        async function fetchData() {
            if (count > 0) {
                await handleAlertClick();
                alert('Not await')
            }
        }
        fetchData();
    }, [count]);
    return (
        <div>
            <p>You clicked {count} times</p>
            <button onClick={() => setCount(count + 1)}>click me</button>
        </div>
    )
}