function fuzzyMatch(input, target, tolerance = 1) {
    const inputWords = input.toLowerCase().trim().split(/\s+/);
    const targetWords = target.toLowerCase().trim().split(/\s+/);

    let matches = 0;

    for (let i = 0; i < inputWords.length; i++) {
        const inputWord = inputWords[i];
        const targetWord = targetWords[i];

        if (!targetWord) {
            break;
        }

        const distance = levenshteinDistance(inputWord, targetWord);

        if (distance <= tolerance) {
            matches++;
        }
    }

    return matches === inputWords.length;
}

function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}