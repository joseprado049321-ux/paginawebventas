        const firebaseConfig = {
            apiKey: "AIzaSyDJhXNwH_kvXaeGTFnde2gCjc96RfCUVAs",
            authDomain: "paginawebventas-2be07.firebaseapp.com",
            projectId: "paginawebventas-2be07",
            storageBucket: "paginawebventas-2be07.firebasestorage.app",
            messagingSenderId: "507118108507",
            appId: "1:507118108507:web:9a740c69622401fb3a647e"
        };

        let db = null;
        let firebaseOK = false;

        function _mostrarEstadoFirebase(msg, color) {
            let banner = document.getElementById('fb-status-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'fb-status-banner';
                document.body.appendChild(banner);
            }
            banner.textContent = msg;
            banner.style.background = color;
            banner.style.color = '#fff';
            banner.style.opacity = '1';
            if (color === '#28a745') setTimeout(() => { banner.style.opacity = '0'; }, 5000);
        }

        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            firebaseOK = true;
            window.firebaseOK = true;
        } catch(e) {
            console.error("Error Firebase:", e);
            window.firebaseOK = false;
        }

        const Firebase = {
            _col() { return db ? db.collection('tienda') : null; },
            async cargar(clave) {
                if (!firebaseOK) return null;
                try {
                    const snap = await this._col().doc(clave).get();
                    return snap.exists ? snap.data().datos : null;
                } catch(e) { return null; }
            },
            guardar(clave, datos) {
                if (!firebaseOK) return;
                this._col().doc(clave).set({ datos })
                    .then(() => _mostrarEstadoFirebase('☁️ Guardado: ' + clave, '#28a745'))
                    .catch(e => _mostrarEstadoFirebase('❌ Error Firebase: ' + e.message, '#dc3545'));
            }
        };

        const Config = { USUARIO_CORRECTO: 'Jose', CONTRASENA_CORRECTA: '12345678' };

        const Estado = {
            ventas: [],
            ventasFiltradas: [],
            inventario: [],
            clientes: [],
            gastos: [],
            costosProductos: {},
            metodoChart: null,
            graficos: { linea: null, pastel: null, area: null, barras: null, dona: null }
        };

        // ════════════════════════════════════════════════════════════════
        // MÓDULO: AUTENTICACIÓN
        // ════════════════════════════════════════════════════════════════
        const Auth = {
            ADMIN_EMAIL: "joseprado049321@gmail.com",
            esAdmin: false,
            modoInvitado: false,
            usuarioActual: null,
            init() {
                if (window.firebaseOK) {
                    firebase.auth().onAuthStateChanged((user) => { if (user) this.manejarAcceso(user); });
                }
                const form = document.getElementById('loginForm');
                if (form) form.addEventListener('submit', (e) => this.loginTradicional(e));
                if (localStorage.getItem('sesionInvitado') === 'true') this.entrarComoInvitado(true);
            },
            async loginConGoogle() {
                if (!window.firebaseOK) return this._notificar("❌ Firebase no conectado", "#ff5f6d");
                const provider = new firebase.auth.GoogleAuthProvider();
                try { await firebase.auth().signInWithPopup(provider); } catch(error) { this._notificar("❌ Error Google: " + error.message, "#ff5f6d"); }
            },
            loginTradicional(e) {
                e.preventDefault();
                const user = document.getElementById('username').value.trim();
                const pass = document.getElementById('password').value.trim();
                if (user === this.ADMIN_EMAIL && pass === "12345678") {
                    this.esAdmin = true; this.modoInvitado = false;
                    localStorage.setItem('sesionActiva', 'true');
                    localStorage.removeItem('sesionInvitado');
                    this.mostrarPantallaPrincipal();
                    this._notificar("✅ Bienvenido Administrador", "linear-gradient(to right,#4472C4,#2c5aa0)");
                } else { this._notificar("❌ Usuario o clave incorrectos", "#ff5f6d"); }
            },
            entrarComoInvitado(auto = false) {
                this.modoInvitado = true; this.esAdmin = false;
                localStorage.setItem('sesionInvitado', 'true');
                localStorage.removeItem('sesionActiva');
                this.mostrarPantallaPrincipal();
                if (!auto) this._notificar("👤 Modo Invitado: solo datos locales", "#6c757d");
            },
            async manejarAcceso(user) {
                this.usuarioActual = user;
                if (user.email === this.ADMIN_EMAIL) {
                    this.esAdmin = true; this.modoInvitado = false;
                    localStorage.setItem('sesionActiva', 'true');
                    this.mostrarPantallaPrincipal();
                    this._notificar(`👑 Bienvenido Administrador`, "linear-gradient(to right,#4472C4,#2c5aa0)");
                    return;
                }
                if (!window.firebaseOK) { this._mostrarPantalla('denied-screen'); return; }
                try {
                    const docRef = db.collection('usuarios_acceso').doc(user.uid);
                    const snap = await docRef.get();
                    if (!snap.exists) {
                        await docRef.set({ uid: user.uid, email: user.email, nombre: user.displayName || '', foto: user.photoURL || '', estado: 'pendiente', fechaSolicitud: new Date().toISOString(), fechaRespuesta: null });
                        this._mostrarPantalla('pending-screen');
                        document.getElementById('pending-user-info').innerHTML = `<strong>📧 ${user.email}</strong><br>${user.displayName || ''}<br><br>Tu solicitud fue enviada al administrador.`;
                        this._notificar("⏳ Solicitud enviada", "#fd7e14");
                    } else {
                        const data = snap.data();
                        if (data.estado === 'aprobado') {
                            this.esAdmin = false; this.modoInvitado = false;
                            localStorage.setItem('sesionActiva', 'true');
                            this.mostrarPantallaPrincipal();
                            this._notificar(`✅ Bienvenido, ${user.displayName ||