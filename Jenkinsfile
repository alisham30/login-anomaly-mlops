pipeline {
    agent any

    environment {
        PYTHON = "python3"
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Verify Python') {
            steps {
                sh '''
                    python3 --version
                    pip3 --version || true
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    sh '''
                        python3 -m pip install --upgrade pip
                        python3 -m pip install --user -r requirements.txt
                    '''
                }
            }
        }

        stage('Train ML Model') {
            steps {
                dir('backend') {
                    sh '''
                        python3 model/train_model.py
                    '''
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build -f Dockerfile -t login-anomaly-mlops .
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully"
        }
        failure {
            echo "❌ Pipeline failed"
        }
    }
}
