(function () {
    const config = window.FeedbackWidgetConfig || {};
    const endpoint = config.endpoint || '/api/feedback';

    function createWidget() {
        let button = document.querySelector(config.buttonSelector || '#feedbackButton');

        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'feedback-button';
            button.textContent = '피드백';
            document.body.appendChild(button);
        }

        const backdrop = document.createElement('div');
        backdrop.className = 'feedback-backdrop';
        backdrop.innerHTML = `
      <div class="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <div class="feedback-header">
          <h2 class="feedback-title" id="feedback-title">피드백 남기기</h2>
          <button type="button" class="feedback-close" aria-label="닫기">×</button>
        </div>
        <form class="feedback-form">
          <div class="feedback-body">
            <div class="feedback-field">
              <span class="feedback-label">별점</span>
              <div class="feedback-stars" aria-label="별점 선택">
                ${[1, 2, 3, 4, 5].map((value) => `
                  <button type="button" class="feedback-star" data-rating="${value}" aria-label="${value}점">★</button>
                `).join('')}
              </div>
            </div>

            <label class="feedback-field">
              <span class="feedback-label">이메일</span>
              <input class="feedback-input" name="email" type="email" placeholder="답변받을 이메일을 입력해주세요" required>
              <span class="feedback-field-message" data-field-message="email"></span>
            </label>

            <label class="feedback-field">
              <span class="feedback-label">좋았던 점</span>
              <textarea class="feedback-textarea" name="positive" maxlength="1000" placeholder="어떤 점이 좋았나요?"></textarea>
            </label>

            <label class="feedback-field">
              <span class="feedback-label">개선할 점</span>
              <textarea class="feedback-textarea" name="improvement" maxlength="1000" placeholder="어떤 점이 개선되면 좋을까요?"></textarea>
            </label>

            <div class="feedback-message" aria-live="polite"></div>
          </div>

          <div class="feedback-actions">
            <button type="button" class="feedback-cancel">취소</button>
            <button type="submit" class="feedback-submit">보내기</button>
          </div>
        </form>
      </div>
    `;

        document.body.appendChild(backdrop);

        const form = backdrop.querySelector('.feedback-form');
        const closeButton = backdrop.querySelector('.feedback-close');
        const cancelButton = backdrop.querySelector('.feedback-cancel');
        const submitButton = backdrop.querySelector('.feedback-submit');
        const message = backdrop.querySelector('.feedback-message');
        const emailMessage = backdrop.querySelector('[data-field-message="email"]');
        const emailInput = form.elements.email;
        const stars = Array.from(backdrop.querySelectorAll('.feedback-star'));

        let rating = 0;

        if (config.email) {
            emailInput.value = config.email;
        }

        async function open() {
            backdrop.classList.add('is-open');
            message.textContent = '';
            emailMessage.textContent = '';
            await loadFeedback();
        }

        function close() {
            backdrop.classList.remove('is-open');
        }

        function setRating(nextRating) {
            rating = nextRating;
            stars.forEach((star) => {
                star.classList.toggle('is-active', Number(star.dataset.rating) <= rating);
            });
        }

        function setEmailMessage(nextMessage) {
            emailMessage.textContent = nextMessage;
            emailInput.classList.toggle('feedback-input--invalid', Boolean(nextMessage));
        }

        async function readErrorMessage(response) {
            try {
                const errorBody = await response.json();
                return errorBody.message || '피드백 전송에 실패했습니다.';
            } catch (error) {
                return '피드백 전송에 실패했습니다.';
            }
        }

        async function loadFeedback() {
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.status === 404 || response.status === 204) {
                    return;
                }

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const feedback = await response.json();
                if (!feedback) {
                    return;
                }

                emailInput.value = feedback.email || emailInput.value || '';
                form.elements.positive.value = feedback.positive || '';
                form.elements.improvement.value = feedback.improvement || '';
                setRating(Number(feedback.rating || 0));
            } catch (error) {
                message.textContent = error.message || '기존 피드백을 불러오지 못했습니다.';
            }
        }

        button.addEventListener('click', open);
        closeButton.addEventListener('click', close);
        cancelButton.addEventListener('click', close);

        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) {
                close();
            }
        });

        stars.forEach((star) => {
            star.addEventListener('click', () => setRating(Number(star.dataset.rating)));
        });

        emailInput.addEventListener('input', () => {
            setEmailMessage('');
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const payload = {
                email: emailInput.value.trim() || null,
                rating,
                positive: form.elements.positive.value.trim(),
                improvement: form.elements.improvement.value.trim()
            };

            message.textContent = '';
            setEmailMessage('');

            if (payload.rating < 1) {
                message.textContent = '별점을 선택해주세요.';
                return;
            }

            if (!payload.email) {
                setEmailMessage('이메일을 입력해주세요.');
                emailInput.focus();
                return;
            }

            if (!emailInput.checkValidity()) {
                setEmailMessage('이메일 형식을 확인해주세요.');
                emailInput.focus();
                return;
            }

            if (!payload.positive && !payload.improvement) {
                message.textContent = '좋았던 점이나 개선할 점 중 하나는 입력해주세요.';
                return;
            }

            submitButton.disabled = true;
            message.textContent = '전송 중입니다...';

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                message.textContent = '피드백이 저장되었습니다. 언제든 다시 수정할 수 있습니다.';

                setTimeout(close, 900);
            } catch (error) {
                message.textContent = error.message || '피드백 전송 중 오류가 발생했습니다.';
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createWidget();
        });
    } else {
        createWidget();
    }
})();
