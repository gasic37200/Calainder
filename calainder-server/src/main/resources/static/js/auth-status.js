const loginLink = document.getElementById('loginLink');
const logoutForm = document.getElementById('logoutForm');

async function renderAuthStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('인증 상태를 확인하지 못했습니다.');
        }

        const { authenticated } = await response.json();
        loginLink.hidden = authenticated;
        logoutForm.hidden = !authenticated;
    } catch (error) {
        console.error(error);
        loginLink.hidden = false;
        logoutForm.hidden = true;
    }
}

renderAuthStatus();
