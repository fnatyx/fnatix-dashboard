/* Auth gate: one shared password, only its SHA-256 hash is stored here. */

const AUTH_GATE_HASH =
    "b70c40c9c56b658179f8056ad48f57f19899032fe39c0a74cc589973edf2c980";


async function authGateHash(text) {

    const data =
        new TextEncoder().encode(text);

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return Array.from(
        new Uint8Array(digest)
    )
        .map(
            (byte) =>
                byte.toString(16).padStart(2, "0")
        )
        .join("");

}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "authGateForm"
            );

        const passwordInput =
            document.getElementById(
                "authGatePassword"
            );

        const errorMessage =
            document.getElementById(
                "authGateError"
            );

        if (!form || !passwordInput) {
            return;
        }

        form.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const enteredHash =
                    await authGateHash(
                        passwordInput.value
                    );

                if (enteredHash === AUTH_GATE_HASH) {

                    localStorage.setItem(
                        "fnatixAuthed",
                        "1"
                    );

                    document.body.classList.remove(
                        "locked"
                    );

                    if (errorMessage) {

                        errorMessage.style.display =
                            "none";

                    }

                } else {

                    if (errorMessage) {

                        errorMessage.style.display =
                            "block";

                    }

                    passwordInput.value =
                        "";

                    passwordInput.focus();

                }

            }
        );

    }
);
