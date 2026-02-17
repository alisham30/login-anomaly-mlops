pipeline {
    agent any

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'pip install -r requirements.txt'
            }
        }

        stage('Train ML Model') {
            steps {
                sh 'python model/train_model.py'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t login-anomaly-mlops .'
            }
        }
    }
}
