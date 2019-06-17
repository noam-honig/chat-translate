const languages = [
    ["English", "en"],
    ["Spanish", "es"],
    ["French", "fr"],
    ["German", "de"],
    ["Portuguese", "pt"],
    ["Hungarian", "hu"],
    ["Dutch", "nl"],
    ["Hindi", "hi"],
    ["Italian", "it"],
    ["Japanese", "ja"],
    ["Polish", "pl"],
    ["Chinese", "zh"],
    ["Norwegian","no"],
    ["Hebrew", "he"]];

export const Language = {
    languages,
    getName: (id: string) => {
        for (const l of languages
        ) {
            if (l[1] == id)
                return l[0];
        }
        return undefined;
    }
};