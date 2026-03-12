from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
from io import BytesIO
import torch
import gc
from PIL import Image

app = FastAPI(title="PeerDiffusion Worker API")

# Store the loaded pipeline in memory to avoid reloading for every task
loaded_pipeline = None
current_model_path = None

class GenerationRequest(BaseModel):
    workflow: dict
    seed: int
    model_path: str

@app.get("/health")
def health_check():
    return {"status": "ok", "cuda_available": torch.cuda.is_available()}

@app.post("/generate")
def generate_image(req: GenerationRequest):
    global loaded_pipeline, current_model_path

    try:
        from diffusers import StableDiffusionPipeline

        # Free memory if switching models
        if current_model_path != req.model_path:
            if loaded_pipeline is not None:
                del loaded_pipeline
                gc.collect()
                torch.cuda.empty_cache()

            print(f"Loading model from {req.model_path}...")
            # Assuming safetensors for prototype
            loaded_pipeline = StableDiffusionPipeline.from_single_file(
                req.model_path,
                torch_dtype=torch.float16,
                use_safetensors=True
            ).to("cuda")
            current_model_path = req.model_path

        # Parse ComfyUI-like workflow for basic prompt parameters
        # In a real scenario, this would involve a complex graph traversal
        prompt = req.workflow.get("prompt", "A beautiful scenery")
        negative_prompt = req.workflow.get("negative_prompt", "")
        steps = req.workflow.get("steps", 20)
        cfg_scale = req.workflow.get("cfg_scale", 7.5)

        print(f"Generating seed {req.seed} with prompt: {prompt}")

        generator = torch.Generator("cuda").manual_seed(req.seed)

        # Execute the pipeline
        image = loaded_pipeline(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            generator=generator
        ).images[0]

        # Convert PIL image to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        print("Generation complete.")
        return {"image_base64": img_str}

    except Exception as e:
        print(f"Error during generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
