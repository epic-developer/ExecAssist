let recaptchaResponse = 0;

function initDashboard(user) {
    if (recaptchaResponse == true) {
        sessionStorage.setItem('isNewUser', user.additionalUserInfo.isNewUser);
        window.open('/dashboard', '_self');
    }
    else if (recaptchaResponse == 0) {
        alert('Please solve the reCAPTCHA.');
        window.open(window.location.href, '_self');
    }
    else if (recaptchaResponse == false) {
        alert('reCAPTCHA failed or expired. Please try again.');
        window.open(window.location.href, '_self');
    }
}

function startScript() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            window.open('/dashboard', '_self');
        }
        else {
            sessionStorage.clear();
            localStorage.clear();
            firebase.auth().signOut();
            var ui = new firebaseui.auth.AuthUI(firebase.auth());
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            var uiConfig = {
                callbacks: {
                    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
                        document.getElementById('firebaseui-auth-container').style.display = 'none';
                        document.getElementById('recaptcha-container').style.display = 'none';
                        initDashboard(authResult);
                        return false;
                    },
                    uiShown: function() {
                        document.getElementById('loader').style.display = 'none';
                    }
                },
                signInFlow: 'popup',
                signInOptions: [
                    {
                        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                        scopes: [
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile',
                            'openid'
                        ]
                    }
                ],
                tosUrl: 'https://www.execassist.io/Terms-of-Service',
                privacyPolicyUrl: 'https://www.execassist.io/Privacy-Policy'
            };
            ui.start('#firebaseui-auth-container', uiConfig);
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    recaptchaResponse = true;
                },
                'expired-callback': () => {
                    recaptchaResponse = false;
                }
            });
            recaptchaVerifier.render().then((widgetId) => {
                window.recaptchaWidgetId = widgetId;
            });
        }
    });
}