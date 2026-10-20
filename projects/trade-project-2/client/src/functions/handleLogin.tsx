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

        const data: {error?: string, username?: string} = await response.json();

        if (!response.ok) {
            throw new Error(data.error ? `Login failed - ${data.error}` : `Login failed - ${response.status}`)
        }

        
        console.log(data)

        return data;

    } catch(err) {
        throw new Error(`${err}`)
    }
}