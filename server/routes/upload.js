import express from "express";
import multer from "multer";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import simpleGit from "simple-git";
import { v4 as uuidv4 } from "uuid";
import archiver from "archiver";
import yauzl from "yauzl";
import astParser from "../services/astParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1000, // Max 1000 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common web development files and ZIP archives
    const allowedExtensions = [
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".html",
      ".css",
      ".vue",
      ".json",
      ".md",
      ".zip",
    ];
    const ext = path.extname(file.originalname).toLowerCase();

    // Allow by extension or MIME type
    if (
      allowedExtensions.includes(ext) ||
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed"
    ) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`), false);
    }
  },
});

/**
 * Upload folder as zip file
 */
router.post("/folder", upload.single("projectZip"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const projectId = uuidv4();
    const extractDir = path.join(__dirname, "../uploads", projectId);

    // Extract zip file
    await extractZipFile(req.file.path, extractDir);

    // Parse the extracted files
    const parseResults = await astParser.parseDirectory(extractDir);

    // Generate dependency graph
    const dependencyGraph = astParser.generateDependencyGraph(parseResults);

    // Save project metadata
    const projectData = {
      id: projectId,
      name: req.body.name || "Uploaded Project",
      type: "folder_upload",
      uploadedAt: new Date(),
      path: extractDir,
      fileCount: parseResults.length,
      parseResults,
      dependencyGraph,
    };

    await saveProjectData(projectId, projectData);

    // Clean up uploaded zip
    await fs.remove(req.file.path);

    res.json({
      success: true,
      projectId,
      fileCount: parseResults.length,
      dependencyGraph,
      summary: generateProjectSummary(parseResults),
    });
  } catch (error) {
    console.error("Folder upload error:", error);
    res.status(500).json({
      error: "Failed to process uploaded folder",
      details: error.message,
    });
  }
});

/**
 * Clone and analyze GitHub repository
 */
router.post("/github", async (req, res) => {
  try {
    const { githubUrl, branch = "main", customBranch = "main" } = req.body;

    if (!githubUrl) {
      return res.status(400).json({ error: "Repository URL is required" });
    }

    // Validate GitHub URL
    if (!isValidGitHubUrl(githubUrl)) {
      return res.status(400).json({ error: "Invalid GitHub URL" });
    }

    const projectId = uuidv4();
    const cloneDir = path.join(__dirname, "../uploads", projectId);

    // Clone repository
    const git = simpleGit();
    console.log(`Cloning ${githubUrl} to ${cloneDir}...`);

    await git.clone(githubUrl, cloneDir, [
      "--depth",
      "1",
      "--branch",
      branch === "custom" ? customBranch : branch,
    ]);

    // Remove .git directory to save space
    await fs.remove(path.join(cloneDir, ".git"));

    // Parse the cloned files
    const parseResults = await astParser.parseDirectory(cloneDir);

    // Generate dependency graph
    const dependencyGraph = astParser.generateDependencyGraph(parseResults);

    // Extract repository info
    const repoInfo = extractRepoInfo(githubUrl);

    // Save project metadata
    const projectData = {
      id: projectId,
      name: repoInfo.name,
      type: "github_clone",
      githubUrl,
      branch,
      clonedAt: new Date(),
      path: cloneDir,
      fileCount: parseResults.length,
      parseResults,
      dependencyGraph,
      repoInfo,
    };

    await saveProjectData(projectId, projectData);

    res.json({
      success: true,
      projectId,
      repoInfo,
      fileCount: parseResults.length,
      dependencyGraph,
      summary: generateProjectSummary(parseResults),
    });
  } catch (error) {
    console.error("GitHub clone error:", error);
    res.status(500).json({
      error: "Failed to clone and analyze repository",
      details: error.message,
    });
  }
});

/**
 * Get project information
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectData = await loadProjectData(projectId);

    if (!projectData) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(projectData);
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      error: "Failed to load project data",
      details: error.message,
    });
  }
});

/**
 * List all projects
 */
router.get("/projects", async (req, res) => {
  try {
    const projects = await listProjects();
    res.json({ projects });
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({
      error: "Failed to list projects",
      details: error.message,
    });
  }
});

/**
 * Delete a project
 */
router.delete("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data to get path
    const projectData = await loadProjectData(projectId);
    if (projectData && projectData.path) {
      await fs.remove(projectData.path);
    }

    // Remove project metadata
    await deleteProjectData(projectId);

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      error: "Failed to delete project",
      details: error.message,
    });
  }
});

// Helper functions

async function extractZipFile(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);

            const filePath = path.join(extractDir, entry.fileName);
            fs.ensureDirSync(path.dirname(filePath));

            const writeStream = fs.createWriteStream(filePath);
            readStream.pipe(writeStream);

            writeStream.on("close", () => {
              zipfile.readEntry();
            });
          });
        }
      });

      zipfile.on("end", () => {
        resolve();
      });
    });
  });
}

function isValidGitHubUrl(url) {
  const githubPattern =
    /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
  return githubPattern.test(url);
}

function extractRepoInfo(githubUrl) {
  const match = githubUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return {
      owner: match[1],
      name: match[2].replace(/\.git$/, ""),
      fullName: `${match[1]}/${match[2].replace(/\.git$/, "")}`,
    };
  }
  return { name: "Unknown Repository" };
}

function generateProjectSummary(parseResults) {
  const summary = {
    totalFiles: parseResults.length,
    fileTypes: {},
    totalFunctions: 0,
    totalClasses: 0,
    totalComponents: 0,
    hasErrors: false,
  };

  parseResults.forEach((file) => {
    // Count file types
    summary.fileTypes[file.extension] =
      (summary.fileTypes[file.extension] || 0) + 1;

    // Count functions, classes, components
    summary.totalFunctions += file.functions?.length || 0;
    summary.totalClasses += file.classes?.length || 0;
    summary.totalComponents += file.components?.length || 0;

    // Check for errors
    if (file.errors && file.errors.length > 0) {
      summary.hasErrors = true;
    }
  });

  return summary;
}

async function saveProjectData(projectId, data) {
  const projectsDir = path.join(__dirname, "../data/projects");
  await fs.ensureDir(projectsDir);

  const filePath = path.join(projectsDir, `${projectId}.json`);
  await fs.writeJson(filePath, data, { spaces: 2 });
}

async function loadProjectData(projectId) {
  const filePath = path.join(
    __dirname,
    "../data/projects",
    `${projectId}.json`
  );

  if (await fs.pathExists(filePath)) {
    return await fs.readJson(filePath);
  }

  return null;
}

async function listProjects() {
  const projectsDir = path.join(__dirname, "../data/projects");

  if (!(await fs.pathExists(projectsDir))) {
    return [];
  }

  const files = await fs.readdir(projectsDir);
  const projects = [];

  for (const file of files) {
    if (file.endsWith(".json")) {
      try {
        const projectData = await fs.readJson(path.join(projectsDir, file));
        // Return summary info only
        projects.push({
          id: projectData.id,
          name: projectData.name,
          type: projectData.type,
          uploadedAt: projectData.uploadedAt || projectData.clonedAt,
          fileCount: projectData.fileCount,
          repoInfo: projectData.repoInfo,
        });
      } catch (error) {
        console.error(`Error reading project file ${file}:`, error);
      }
    }
  }

  return projects.sort(
    (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
  );
}

async function deleteProjectData(projectId) {
  const filePath = path.join(
    __dirname,
    "../data/projects",
    `${projectId}.json`
  );

  if (await fs.pathExists(filePath)) {
    await fs.remove(filePath);
  }
}

export default router;
