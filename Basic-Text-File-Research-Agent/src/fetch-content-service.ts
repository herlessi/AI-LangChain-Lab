// Fetches the text content of a URL (used as the tool's implementation)
// o type de url é '{url:string}' pq é o valor recebido ao criar o tool
export const fetchContent = async ({url}:{url:string}): Promise<string> =>{
 
    // controlar o timeout da requisição
    const controller = new AbortController()
    const timeoutId = setTimeout(() =>controller.abort(),120_000)

    try {
        //fazendo a requisição, o fetch responde assim que o servidor responda, mesmo que o download ainda
        // esteja acontecendo, por isso precisaremos de outro await em resp.text()
        const resp = await fetch(url,{
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; quickstart-research/1.0)",
            },
            signal: controller.signal //faz o bind com o controller para que, se necessario, o abort seja executado.
        })

        if(!resp.ok){
            return `Fetch Failed: HTTP ${resp.status} ${resp.statusText}`
        }

        // só resolve a promisse quando todo o texto for lido
        return await resp.text();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message: String(error)
        return `Fetch Failed: ${errorMessage}`
    } finally{
        clearTimeout(timeoutId)
    }

}