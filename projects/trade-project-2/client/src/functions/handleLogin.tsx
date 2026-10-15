export async function handleLogin(url: string, user: string, pass: string) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: user,
                password: pass
            })
        })

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`)
        }

        const data: string = await response.json();
        console.log(data)

        return data;

    } catch(err) {
        throw new Error(`${err}`)
    }
}