allprojects {
    repositories {
        // Flutter engine artifacts (io.flutter:armeabi_v7a_release etc.) are
        // published under the /download.flutter.io/ path of Google Cloud
        // Storage. The short host download.flutter.io is intercepted by the
        // local proxy and its certificate gets mangled, but the canonical
        // storage.googleapis.com host reaches directly and serves the same
        // artifacts, so we use it instead.
        maven { url = uri("https://storage.googleapis.com/download.flutter.io") }
        maven { url = uri("https://mirror.kargadan.ir/repository/maven-public/") }
        maven { url = uri("https://mirror.kargadan.ir/repository/google/") }
        maven { url = uri("https://dl.google.com/dl/android/maven2/") }
        maven { url = uri("https://repo.maven.apache.org/maven2/") }
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
